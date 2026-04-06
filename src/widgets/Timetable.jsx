import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchTimetable, upsertTimetableEntry, deleteTimetableEntry } from "../api/timetable"
import { fetchProfileRow } from "../api/settings"
import TimeBlock from "./Components/TimeBlock"

const DAY_LABELS = ["", "월", "화", "수", "목", "금"]
const DEFAULT_PERIODS = [
  { label: "1교시", start: "08:20", enabled: true },
  { label: "2교시", start: "09:20", enabled: true },
  { label: "3교시", start: "10:20", enabled: true },
  { label: "4교시", start: "11:20", enabled: true },
  { label: "점심시간", start: "12:10", enabled: true },
  { label: "5교시", start: "13:00", enabled: true },
  { label: "6교시", start: "14:00", enabled: true },
  { label: "7교시", start: "15:00", enabled: true },
  { label: "방과후 A", start: "16:30", enabled: false },
  { label: "방과후 B", start: "18:20", enabled: false },
]

export default function Timetable() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [periods, setPeriods] = useState(DEFAULT_PERIODS)
  const [highlightToday, setHighlightToday] = useState(true)

  const loadTimetable = useCallback(async () => {
    if (!user) return
    const [ttResult, profileResult] = await Promise.all([
      fetchTimetable(user.id),
      fetchProfileRow(user.id),
    ])
    if (ttResult.data) setEntries(ttResult.data)
    if (profileResult.data) {
      if (profileResult.data.today_highlight === false) setHighlightToday(false)
      const saved = profileResult.data.period_schedule
      if (Array.isArray(saved) && saved.length > 0) {
        setPeriods(DEFAULT_PERIODS.map((def, i) => ({
          label: saved[i]?.label || def.label,
          start: saved[i]?.start || def.start,
          enabled: saved[i]?.enabled ?? def.enabled,
        })))
      }
    }
  }, [user])

  useEffect(() => {
    loadTimetable()
  }, [loadTimetable])

  useEffect(() => {
    const handler = (e) => setHighlightToday(e.detail)
    window.addEventListener("today-highlight-change", handler)
    return () => window.removeEventListener("today-highlight-change", handler)
  }, [])

  const entryMap = {}
  const skippedCells = new Set()
  for (const entry of entries) {
    entryMap[`${entry.day}-${entry.start_period}`] = entry
    if (entry.end_period > entry.start_period) {
      for (let p = entry.start_period + 1; p <= entry.end_period; p++) {
        skippedCells.add(`${entry.day}-${p}`)
      }
    }
  }

  const handleSave = async (day, period, updates) => {
    if (!user) { setEditingCell(null); return }
    const existing = entryMap[`${day}-${period}`]

    try {
      if (!updates.subject && !existing) {
        setEditingCell(null)
        return
      }

      if (!updates.subject && existing) {
        await deleteTimetableEntry(existing.id)
        await loadTimetable()
        window.dispatchEvent(new Event("timetable-change"))
        setEditingCell(null)
        return
      }

      const entry = {
        user_id: user.id,
        day,
        start_period: period,
        end_period: updates.end_period ?? existing?.end_period ?? period,
        subject: updates.subject ?? "",
        room: updates.room ?? existing?.room ?? "",
        color: updates.color ?? existing?.color ?? "#EBEBEB",
      }
      if (existing?.id) entry.id = existing.id

      await upsertTimetableEntry(entry)
      await loadTimetable()
      window.dispatchEvent(new Event("timetable-change"))
    } finally {
      setEditingCell(null)
    }
  }

  const todayDayIndex = new Date().getDay()

  const visiblePeriods = periods
    .map((p, i) => ({ ...p, originalIndex: i + 1 }))
    .filter((p) => p.enabled)

  const lunchOriginalIdx = periods.findIndex((p) => p.label === "점심시간") + 1
  const totalRows = visiblePeriods.length + 1

  const cells = []
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < 6; col++) {
      const isToday = highlightToday && col >= 1 && col === todayDayIndex

      if (row === 0) {
        cells.push(
          <TimeBlock
            key={`${row}-${col}`}
            bg={isToday ? "var(--tt-today-bg, #3B3B3B)" : "var(--tt-header-bg, #FBFBFB)"}
            label={DAY_LABELS[col]}
            isHeader
            isToday={isToday}
          />
        )
        continue
      }

      const vp = visiblePeriods[row - 1]
      const period = vp.originalIndex
      const isHighlight = period === lunchOriginalIdx || col === 0

      if (col === 0) {
        cells.push(
          <TimeBlock
            key={`${row}-${col}`}
            bg="var(--tt-header-bg, #FBFBFB)"
            label={vp.label}
            sub={vp.start}
            isHeader
          />
        )
        continue
      }

      const day = col
      const cellKey = `${day}-${period}`

      if (skippedCells.has(cellKey)) continue

      const entry = entryMap[cellKey]
      const span = entry ? entry.end_period - entry.start_period + 1 : 1
      const isEditing = editingCell === cellKey

      cells.push(
        <TimeBlock
          key={`${row}-${col}`}
          bg={entry?.color || (isHighlight ? "var(--tt-header-bg, #FBFBFB)" : "var(--tt-empty-bg, #EBEBEB)")}
          label={entry?.subject || ""}
          room={entry?.room || ""}
          span={span}
          isEditing={isEditing}
          onDoubleClick={() => setEditingCell(cellKey)}
          onSave={(updates) => handleSave(day, period, updates)}
          currentEntry={entry}
          row={row}
          isToday={isToday}
        />
      )
    }
  }

  return (
    <div className="bg-widjet rounded-2xl p-7 h-full flex flex-col min-h-0">
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold mb-4 shrink-0">내 시간표</p>
      <div
        className="grid grid-cols-6 flex-1 min-h-0 gap-1"
        style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  )
}
