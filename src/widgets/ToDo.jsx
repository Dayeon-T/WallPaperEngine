import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import {
  fetchTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  updateTodoPosition,
  toggleImportant,
  updateTodoContent,
} from "../api/todos"

const SORT_MODES = [
  { id: "important", label: "중요도순" },
  { id: "due", label: "마감일순" },
  { id: "newest", label: "최신순" },
]

function getDDayText(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + "T00:00:00")
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "D-Day"
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function getDDayColor(dateStr) {
  if (!dateStr) return ""
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + "T00:00:00")
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return "text-gray-400"
  if (diff === 0) return "text-red-500"
  if (diff <= 3) return "text-amber-500"
  return "text-blue-500"
}

export default function ToDo() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState("")
  const [sortMode, setSortMode] = useState("important")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const dragNode = useRef(null)
  const editRef = useRef(null)
  const listRef = useRef(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await fetchTodos(user.id)
    if (data) setTodos(data)
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (editId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editId])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const itemHeight = 44
      const available = el.clientHeight
      const count = Math.max(1, Math.floor(available / itemHeight))
      setPageSize(count)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const sortedTodos = useMemo(() => {
    const sorted = [...todos]
    if (sortMode === "important") {
      sorted.sort((a, b) => {
        const ai = a.is_important ? 1 : 0
        const bi = b.is_important ? 1 : 0
        if (bi !== ai) return bi - ai
        return (a.position ?? 0) - (b.position ?? 0)
      })
    } else if (sortMode === "due") {
      sorted.sort((a, b) => {
        const ad = a.due_date || "9999-12-31"
        const bd = b.due_date || "9999-12-31"
        if (ad !== bd) return ad.localeCompare(bd)
        return (a.position ?? 0) - (b.position ?? 0)
      })
    } else {
      sorted.sort((a, b) => {
        const ac = a.created_at || ""
        const bc = b.created_at || ""
        return bc.localeCompare(ac)
      })
    }
    return sorted
  }, [todos, sortMode])

  const totalPages = Math.max(1, Math.ceil(sortedTodos.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pagedTodos = sortedTodos.slice(safePage * pageSize, (safePage + 1) * pageSize)

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1)
  }, [totalPages, page])

  const cycleSortMode = () => {
    const idx = SORT_MODES.findIndex((m) => m.id === sortMode)
    const next = SORT_MODES[(idx + 1) % SORT_MODES.length]
    setSortMode(next.id)
    setPage(0)
  }

  const currentSortLabel = SORT_MODES.find((m) => m.id === sortMode)?.label

  const handleAdd = async () => {
    const text = input.trim()
    if (!text || !user) return
    const maxPos = todos.length > 0 ? Math.max(...todos.map((t) => t.position ?? 0)) + 1 : 0
    await addTodo(user.id, text, maxPos, dueDate || null)
    setInput("")
    setDueDate("")
    await load()
  }

  const handleToggle = async (id, current) => {
    await toggleTodo(id, !current)
    await load()
    window.dispatchEvent(new Event("todo-change"))
  }

  const handleDelete = async (id) => {
    await deleteTodo(id)
    await load()
  }

  const handleImportant = async (id, current) => {
    await toggleImportant(id, !current)
    await load()
  }

  const handleDoubleClick = (todo) => {
    setEditId(todo.id)
    setEditText(todo.content)
  }

  const handleEditSave = async () => {
    const text = editText.trim()
    if (!text || !editId) {
      setEditId(null)
      return
    }
    await updateTodoContent(editId, text)
    setEditId(null)
    setEditText("")
    await load()
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") handleEditSave()
    if (e.key === "Escape") {
      setEditId(null)
      setEditText("")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd()
  }

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    dragNode.current = e.target
    e.dataTransfer.effectAllowed = "move"
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4"
    }, 0)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setOverIdx(idx)
  }

  const handleDragEnd = async () => {
    if (dragNode.current) dragNode.current.style.opacity = "1"

    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const reordered = [...sortedTodos]
      const [moved] = reordered.splice(dragIdx, 1)
      reordered.splice(overIdx, 0, moved)
      setTodos(reordered)

      const promises = reordered.map((todo, i) => updateTodoPosition(todo.id, i))
      await Promise.all(promises)
      await load()
    }

    setDragIdx(null)
    setOverIdx(null)
    dragNode.current = null
  }

  return (
    <div className="h-full bg-widjet rounded-2xl p-7 flex flex-col min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">할 일</p>
        <button
          onClick={cycleSortMode}
          className="text-[clamp(0.55rem,0.65vw,0.75rem)] text-muted hover:text-text transition-colors flex items-center gap-1 select-none"
          title="클릭하여 정렬 변경"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M6 12h12M9 18h6" />
          </svg>
          {currentSortLabel}
        </button>
      </div>

      <div className="flex gap-2 mt-4 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="해야 할 일을 입력하세요."
          className="flex-1 rounded-xl px-4 py-2.5 text-[clamp(0.7rem,0.75vw,0.9rem)] outline-none focus:ring-1 focus:ring-primary min-w-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-xl px-2 py-2.5 text-[clamp(0.6rem,0.65vw,0.8rem)] outline-none focus:ring-1 focus:ring-primary w-[clamp(6rem,8vw,9rem)] shrink-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
          title="마감일 (선택)"
        />
        <button
          onClick={handleAdd}
          className="rounded-xl px-5 py-2.5 text-[clamp(0.7rem,0.75vw,0.9rem)] font-semibold hover:opacity-80 transition-colors shrink-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        >
          추가
        </button>
      </div>

      <div ref={listRef} className="mt-4 flex-1 min-h-0 flex flex-col">
        {pagedTodos.map((todo, idx) => {
          const ddayText = getDDayText(todo.due_date)
          const ddayColor = getDDayColor(todo.due_date)
          const globalIdx = page * pageSize + idx

          return (
            <div
              key={todo.id}
              draggable={editId !== todo.id}
              onDragStart={(e) => handleDragStart(e, globalIdx)}
              onDragOver={(e) => handleDragOver(e, globalIdx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                editId === todo.id ? "" : "cursor-grab active:cursor-grabbing"
              } ${overIdx === globalIdx && dragIdx !== globalIdx ? "bg-gray-50" : ""}`}
            >
              <button
                onClick={() => handleToggle(todo.id, todo.is_done)}
                className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: todo.is_done ? "#2b2b2b" : "#ccc",
                  backgroundColor: todo.is_done ? "#2b2b2b" : "transparent",
                }}
              >
                {todo.is_done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {editId === todo.id ? (
                <input
                  ref={editRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditSave}
                  className="flex-1 text-[clamp(0.7rem,0.8vw,1rem)] bg-transparent border-b-2 border-primary outline-none py-0.5"
                />
              ) : (
                <span
                  onDoubleClick={() => handleDoubleClick(todo)}
                  className={`flex-1 text-[clamp(0.7rem,0.8vw,1rem)] truncate select-none min-w-0 ${
                    todo.is_done ? "line-through text-muted" : ""
                  }`}
                  title="더블 클릭하여 수정"
                >
                  {todo.content}
                </span>
              )}

              {ddayText && (
                <span className={`text-[clamp(0.5rem,0.55vw,0.7rem)] font-semibold shrink-0 ${ddayColor}`}>
                  {ddayText}
                </span>
              )}

              <button
                onClick={() => handleImportant(todo.id, todo.is_important)}
                className="shrink-0 transition-all text-[clamp(0.8rem,0.9vw,1.1rem)] leading-none hover:scale-110"
                title={todo.is_important ? "중요 해제" : "중요 표시"}
              >
                {todo.is_important ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted hover:text-amber-400">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handleDelete(todo.id)}
                className="shrink-0 text-muted hover:text-text transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[clamp(0.6rem,0.7vw,0.85rem)] hover:opacity-60 transition-opacity disabled:opacity-30"
          >
            ◀
          </button>
          <span className="text-[clamp(0.55rem,0.65vw,0.75rem)] text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[clamp(0.6rem,0.7vw,0.85rem)] hover:opacity-60 transition-opacity disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  )
}
