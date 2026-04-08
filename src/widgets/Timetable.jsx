import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchTimetable, upsertTimetableEntry, deleteTimetableEntry } from "../api/timetable"
import { fetchProfileRow, upsertProfileRow } from "../api/settings"
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

function getMondayStr() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${dd}`
}

export default function Timetable() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [periods, setPeriods] = useState(DEFAULT_PERIODS)
  const [highlightToday, setHighlightToday] = useState(true)
  const [swapMode, setSwapMode] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [weeklyOverrides, setWeeklyOverrides] = useState({})

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
      const wt = profileResult.data.weekly_timetable
      if (wt && wt.week === getMondayStr() && wt.map) {
        setWeeklyOverrides(wt.map)
      } else {
        setWeeklyOverrides({})
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

  const baseEntryMap = {}
  const baseSkipped = new Set()
  for (const entry of entries) {
    baseEntryMap[`${entry.day}-${entry.start_period}`] = entry
    if (entry.end_period > entry.start_period) {
      for (let p = entry.start_period + 1; p <= entry.end_period; p++) {
        baseSkipped.add(`${entry.day}-${p}`)
      }
    }
  }

  const getEffectiveEntry = (cellKey) => {
    if (weeklyOverrides[cellKey] !== undefined) {
      return weeklyOverrides[cellKey]
    }
    return baseEntryMap[cellKey] || null
  }

  const effectiveMap = {}
  const effectiveSkipped = new Set()
  const allKeys = new Set([
    ...Object.keys(baseEntryMap),
    ...Object.keys(weeklyOverrides),
  ])
  for (const key of allKeys) {
    const entry = getEffectiveEntry(key)
    if (entry) {
      effectiveMap[key] = entry
      if (entry.end_period > entry.start_period) {
        for (let p = entry.start_period + 1; p <= entry.end_period; p++) {
          effectiveSkipped.add(`${entry.day}-${p}`)
        }
      }
    }
  }

  const saveWeeklyOverrides = async (newMap) => {
    if (!user) return
    const wt = { week: getMondayStr(), map: newMap }
    setWeeklyOverrides(newMap)
    await upsertProfileRow(user.id, { weekly_timetable: wt })
  }

  const handleSwapClick = async (cellKey) => {
    if (!selectedCell) {
      setSelectedCell(cellKey)
      return
    }
    if (selectedCell === cellKey) {
      setSelectedCell(null)
      return
    }

    const entryA = getEffectiveEntry(selectedCell)
    const entryB = getEffectiveEntry(cellKey)

    const [dayA, periodA] = selectedCell.split("-").map(Number)
    const [dayB, periodB] = cellKey.split("-").map(Number)

    const newMap = { ...weeklyOverrides }

    if (entryA) {
      newMap[cellKey] = {
        ...entryA,
        day: dayB,
        start_period: periodB,
        end_period: periodB + (entryA.end_period - entryA.start_period),
      }
    } else {
      newMap[cellKey] = null
    }

    if (entryB) {
      newMap[selectedCell] = {
        ...entryB,
        day: dayA,
        start_period: periodA,
        end_period: periodA + (entryB.end_period - entryB.start_period),
      }
    } else {
      newMap[selectedCell] = null
    }

    await saveWeeklyOverrides(newMap)
    setSelectedCell(null)
  }

  const handleResetWeekly = async () => {
    await saveWeeklyOverrides({})
    setSelectedCell(null)
  }

  const handleSave = async (day, period, updates) => {
    if (!user) { setEditingCell(null); return }
    const existing = baseEntryMap[`${day}-${period}`]

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

      if (effectiveSkipped.has(cellKey)) continue

      const entry = effectiveMap[cellKey]
      const span = entry ? entry.end_period - entry.start_period + 1 : 1
      const isEditing = editingCell === cellKey
      const isSelected = swapMode && selectedCell === cellKey

      cells.push(
        <TimeBlock
          key={`${row}-${col}`}
          bg={entry?.color || (isHighlight ? "var(--tt-header-bg, #FBFBFB)" : "var(--tt-empty-bg, #EBEBEB)")}
          label={entry?.subject || ""}
          room={entry?.room || ""}
          span={span}
          isEditing={isEditing}
          isSelected={isSelected}
          swapMode={swapMode}
          onDoubleClick={swapMode ? undefined : () => setEditingCell(cellKey)}
          onClick={swapMode ? () => handleSwapClick(cellKey) : undefined}
          onSave={(updates) => handleSave(day, period, updates)}
          currentEntry={entry}
          row={row}
          isToday={isToday}
        />
      )
    }
  }

  const hasOverrides = Object.keys(weeklyOverrides).length > 0

  return (
    <div className="bg-widjet rounded-2xl p-7 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">내 시간표</p>
        <div className="flex items-center gap-2">
          {swapMode && hasOverrides && (
            <button
              onClick={handleResetWeekly}
              className="text-[clamp(0.5rem,0.6vw,0.7rem)] text-gray-400 hover:text-red-500 transition-colors"
            >
              초기화
            </button>
          )}
          <button
            onClick={() => { setSwapMode(!swapMode); setSelectedCell(null) }}
            className={`text-[clamp(0.5rem,0.6vw,0.7rem)] px-2 py-1 rounded-lg transition-colors ${
              swapMode
                ? "bg-primary text-white"
                : "text-muted hover:bg-gray-100"
            }`}
          >
            {swapMode ? "편집 완료" : "이번주 편집"}
          </button>
        </div>
      </div>
      {swapMode && (
        <p className="text-[clamp(0.5rem,0.55vw,0.65rem)] text-gray-400 mb-2 shrink-0">
          셀을 클릭해서 선택 → 다른 셀을 클릭하면 교환됩니다. 월요일에 초기화됩니다.
        </p>
      )}
      <div
        className="grid grid-cols-6 flex-1 min-h-0 gap-1"
        style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  )
}
