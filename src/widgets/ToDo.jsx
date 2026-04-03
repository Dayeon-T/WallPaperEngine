import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchTodos, addTodo, toggleTodo, deleteTodo, updateTodoPosition } from "../api/todos"

export default function ToDo() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState("")
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const dragNode = useRef(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await fetchTodos(user.id)
    if (data) setTodos(data)
  }, [user])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const text = input.trim()
    if (!text || !user) return
    const maxPos = todos.length > 0 ? Math.max(...todos.map((t) => t.position ?? 0)) + 1 : 0
    await addTodo(user.id, text, maxPos)
    setInput("")
    await load()
  }

  const handleToggle = async (id, current) => {
    await toggleTodo(id, !current)
    await load()
  }

  const handleDelete = async (id) => {
    await deleteTodo(id)
    await load()
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
      const reordered = [...todos]
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
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold shrink-0">할 일</p>

      <div className="flex gap-2 mt-4 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="해야 할 일을 입력하고 추가하세요."
          className="flex-1 rounded-xl px-4 py-2.5 text-[clamp(0.7rem,0.75vw,0.9rem)] outline-none focus:ring-1 focus:ring-primary"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        />
        <button
          onClick={handleAdd}
          className="rounded-xl px-5 py-2.5 text-[clamp(0.7rem,0.75vw,0.9rem)] font-semibold hover:opacity-80 transition-colors"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        >
          추가
        </button>
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto flex flex-col">
        {todos.map((todo, idx) => (
          <div
            key={todo.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0 cursor-grab active:cursor-grabbing transition-colors ${
              overIdx === idx && dragIdx !== idx ? "bg-gray-50" : ""
            }`}
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
            <span
              className={`flex-1 text-[clamp(0.7rem,0.8vw,1rem)] ${
                todo.is_done ? "line-through text-muted" : ""
              }`}
            >
              {todo.content}
            </span>
            <button
              onClick={() => handleDelete(todo.id)}
              className="shrink-0 text-muted hover:text-text transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
