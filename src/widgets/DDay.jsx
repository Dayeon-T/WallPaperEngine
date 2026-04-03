import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchProfileRow, upsertProfileRow } from "../api/settings"
import DateDropdown from "./Components/DateDropdown"

function getDDay(targetDate) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDDay(diff) {
  if (diff === 0) return "D-Day"
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

export default function DDay() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: "", date: "" })
  const [editId, setEditId] = useState(null)

  const loadEvents = useCallback(async () => {
    if (!user) return
    const { data } = await fetchProfileRow(user.id)
    if (data?.dday_events && Array.isArray(data.dday_events)) {
      setEvents(data.dday_events)
    }
  }, [user])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail && Array.isArray(e.detail)) setEvents(e.detail)
      else loadEvents()
    }
    window.addEventListener("dday-change", handler)
    return () => window.removeEventListener("dday-change", handler)
  }, [loadEvents])

  const persist = async (next) => {
    if (!user) return
    await upsertProfileRow(user.id, { dday_events: next })
    setEvents(next)
    window.dispatchEvent(new CustomEvent("dday-change", { detail: next }))
  }

  const sorted = [...events].sort((a, b) => {
    const da = Math.abs(getDDay(a.date))
    const db = Math.abs(getDDay(b.date))
    return da - db
  })

  const handleAdd = async () => {
    if (!form.title.trim() || !form.date) return
    let next
    if (editId !== null) {
      next = events.map(ev => ev.id === editId ? { ...ev, ...form } : ev)
      setEditId(null)
    } else {
      next = [...events, { ...form, id: Date.now() }]
    }
    await persist(next)
    setForm({ title: "", date: "" })
    setEditing(false)
  }

  const handleEdit = (ev) => {
    setForm({ title: ev.title, date: ev.date })
    setEditId(ev.id)
    setEditing(true)
  }

  const handleDelete = async (id) => {
    const next = events.filter(ev => ev.id !== id)
    await persist(next)
    if (editId === id) {
      setEditId(null)
      setForm({ title: "", date: "" })
      setEditing(false)
    }
  }

  return (
    <div className="bg-widjet rounded-2xl p-7 flex flex-col  overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold widget-title">D-Day</p>
        <button
          onClick={() => { setEditing(!editing); setEditId(null); setForm({ title: "", date: "" }) }}
          className="text-xs text-muted hover:text-primary transition-colors"
        >
          {editing ? "취소" : "+ 추가"}
        </button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 mb-3">
          <input
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary"
            placeholder="일정 이름"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <DateDropdown
            size="small"
            value={form.date}
            onChange={(v) => setForm(f => ({ ...f, date: v }))}
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAdd}
              className="bg-btn rounded-lg px-4 h-9 text-sm font-medium shrink-0"
            >
              {editId !== null ? "수정" : "추가"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center mt-4">
            D-Day 일정을 추가해보세요.
          </p>
        )}
        {sorted.map((ev) => {
          const diff = getDDay(ev.date)
          const isToday = diff === 0
          const isPast = diff < 0
          return (
            <div
              key={ev.id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors cursor-pointer group ${
                isToday
                  ? "bg-primary text-white"
                  : isPast
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => handleEdit(ev)}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className={`text-sm font-medium truncate ${isToday ? "text-white" : ""}`}>
                  {ev.title}
                </span>
                <span className={`text-[10px] ${isToday ? "text-white/70" : "text-muted"}`}>
                  {ev.date}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-lg font-bold ${isToday ? "text-white" : isPast ? "text-gray-400" : "text-primary"}`}>
                  {formatDDay(diff)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ev.id) }}
                  className={`opacity-0 group-hover:opacity-100 text-xs transition-opacity ${
                    isToday ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-red-500"
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
