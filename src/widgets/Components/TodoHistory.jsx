import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { searchCompletedTodos } from "../../api/todos"

export default function TodoHistory({ onClose }) {
  const { user } = useAuth()
  const [results, setResults] = useState([])
  const [keyword, setKeyword] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await searchCompletedTodos(user.id, {
      from: from || undefined,
      to: to || undefined,
      keyword: keyword.trim() || undefined,
    })
    setResults(data)
    setSearched(true)
    setLoading(false)
  }

  useEffect(() => {
    if (user) handleSearch()
  }, [user])

  const formatDate = (ts) => {
    if (!ts) return ""
    const d = new Date(ts)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">완료 기록</p>
        <button
          onClick={onClose}
          className="text-[clamp(0.55rem,0.65vw,0.75rem)] text-muted hover:text-text transition-colors"
        >
          ← 할 일로 돌아가기
        </button>
      </div>

      <div className="flex gap-2 mt-4 shrink-0 flex-wrap">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="검색어"
          className="flex-1 min-w-[80px] rounded-xl px-3 py-2 text-[clamp(0.65rem,0.7vw,0.85rem)] outline-none focus:ring-1 focus:ring-primary"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl px-2 py-2 text-[clamp(0.55rem,0.6vw,0.75rem)] outline-none focus:ring-1 focus:ring-primary w-[clamp(5.5rem,7vw,8rem)] shrink-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
          title="시작일"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl px-2 py-2 text-[clamp(0.55rem,0.6vw,0.75rem)] outline-none focus:ring-1 focus:ring-primary w-[clamp(5.5rem,7vw,8rem)] shrink-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
          title="종료일"
        />
        <button
          onClick={handleSearch}
          className="rounded-xl px-4 py-2 text-[clamp(0.65rem,0.7vw,0.85rem)] font-semibold hover:opacity-80 transition-colors shrink-0"
          style={{ backgroundColor: "var(--todo-bg, var(--color-btn))", color: "var(--todo-text, inherit)" }}
        >
          검색
        </button>
      </div>

      <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
        {loading && <p className="text-xs text-muted py-4 text-center">검색 중...</p>}

        {!loading && searched && results.length === 0 && (
          <p className="text-xs text-muted py-4 text-center">완료된 할 일이 없습니다.</p>
        )}

        {!loading && results.map((todo) => (
          <div key={todo.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
            <span className="shrink-0 w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="flex-1 text-[clamp(0.65rem,0.75vw,0.9rem)] truncate min-w-0">
              {todo.content}
            </span>
            <span className="text-[clamp(0.5rem,0.55vw,0.7rem)] text-muted shrink-0">
              {formatDate(todo.completed_at)}
            </span>
          </div>
        ))}
      </div>

      {!loading && results.length > 0 && (
        <p className="text-[clamp(0.5rem,0.55vw,0.65rem)] text-muted text-center pt-2 shrink-0">
          총 {results.length}건
        </p>
      )}
    </div>
  )
}
