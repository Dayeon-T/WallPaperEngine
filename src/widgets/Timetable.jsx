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
  // 내 시간표(map)와 학급 시간표(classMap)의 이번주 교환 기록을 한 컬럼에 함께 저장한다.
  const [weeklyMaps, setWeeklyMaps] = useState({ map: {}, classMap: {} })
  const [tab, setTab] = useState("personal")
  const [homeroomClass, setHomeroomClass] = useState(null)

  const weeklyOverrides = tab === "class" ? weeklyMaps.classMap : weeklyMaps.map

  const loadTimetable = useCallback(async () => {
    if (!user) return
    const isClass = tab === "class"
    const [ttResult, profileResult] = await Promise.all([
      fetchTimetable(user.id, isClass),
      fetchProfileRow(user.id),
    ])
    if (ttResult.data) setEntries(ttResult.data)
    if (profileResult.data) {
      if (profileResult.data.today_highlight === false) setHighlightToday(false)
      setHomeroomClass(profileResult.data.homeroom_class || null)
      const saved = profileResult.data.period_schedule
      if (Array.isArray(saved) && saved.length > 0) {
        setPeriods(DEFAULT_PERIODS.map((def, i) => ({
          label: saved[i]?.label || def.label,
          start: saved[i]?.start || def.start,
          enabled: saved[i]?.enabled ?? def.enabled,
        })))
      }
      const wt = profileResult.data.weekly_timetable
      if (wt && wt.week === getMondayStr()) {
        setWeeklyMaps({ map: wt.map || {}, classMap: wt.classMap || {} })
      } else {
        setWeeklyMaps({ map: {}, classMap: {} })
        // 지난주 교환 기록은 더 이상 쓰이지 않는다. 남겨두면 언제 만들어진
        // 값인지 알 수 없어 문제가 생겼을 때 추적이 어렵다.
        if (wt) {
          upsertProfileRow(user.id, { weekly_timetable: null })
        }
      }
    }
  }, [user, tab])

  useEffect(() => {
    loadTimetable()
  }, [loadTimetable])

  useEffect(() => {
    const handler = (e) => setHighlightToday(e.detail)
    window.addEventListener("today-highlight-change", handler)
    return () => window.removeEventListener("today-highlight-change", handler)
  }, [])

  const baseEntryMap = {}
  const baseCellMap = {}
  for (const entry of entries) {
    baseEntryMap[`${entry.day}-${entry.start_period}`] = entry
    for (let p = entry.start_period; p <= entry.end_period; p++) {
      baseCellMap[`${entry.day}-${p}`] = entry
    }
  }

  const getEffectiveEntry = (cellKey) => {
    if (weeklyOverrides[cellKey] !== undefined) {
      return weeklyOverrides[cellKey]
    }
    return baseCellMap[cellKey] || null
  }

  const getCellEntry = (day, period) => {
    const cellKey = `${day}-${period}`
    const entry = getEffectiveEntry(cellKey)
    if (!entry) return null
    return { ...entry, day, start_period: period, end_period: period }
  }

  const getGroupKey = (day, period) => {
    const cellKey = `${day}-${period}`
    const entry = getEffectiveEntry(cellKey)
    if (!entry) return ""
    if (weeklyOverrides[cellKey] !== undefined) return `override-${cellKey}`
    return entry.id || `base-${entry.day}-${entry.start_period}`
  }

  const getSpan = (day, rowIndex) => {
    const period = visiblePeriods[rowIndex].originalIndex
    const groupKey = getGroupKey(day, period)
    if (!groupKey) return 1

    let span = 1
    for (let i = rowIndex + 1; i < visiblePeriods.length; i++) {
      const nextPeriod = visiblePeriods[i].originalIndex
      if (getGroupKey(day, nextPeriod) !== groupKey) break
      span += 1
    }
    return span
  }

  const saveWeeklyOverrides = async (newMap) => {
    if (!user) return
    const mapKey = tab === "class" ? "classMap" : "map"
    const nextMaps = { ...weeklyMaps, [mapKey]: newMap }
    setWeeklyMaps(nextMaps)
    const wt = { week: getMondayStr(), map: nextMaps.map, classMap: nextMaps.classMap }
    await upsertProfileRow(user.id, { weekly_timetable: wt })
    window.dispatchEvent(new Event("timetable-change"))
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
        end_period: periodB,
      }
    } else {
      newMap[cellKey] = null
    }

    if (entryB) {
      newMap[selectedCell] = {
        ...entryB,
        day: dayA,
        start_period: periodA,
        end_period: periodA,
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

  // 직접 고친 칸은 '이번주 교환' 기록보다 우선한다.
  // 교환으로 비운 칸(null 오버라이드)이 남아 있으면 새로 입력한 과목이 저장은 되고도
  // 화면에는 계속 빈 칸으로 보인다.
  const clearWeeklyOverridesFor = async (day, startPeriod, endPeriod) => {
    const keys = []
    for (let p = startPeriod; p <= endPeriod; p++) keys.push(`${day}-${p}`)
    if (!keys.some((k) => k in weeklyOverrides)) return

    const next = { ...weeklyOverrides }
    for (const k of keys) delete next[k]
    await saveWeeklyOverrides(next)
  }

  const handleSave = async (day, period, updates) => {
    if (!user) { setEditingCell(null); return }
    const existing = baseEntryMap[`${day}-${period}`]

    try {
      if (!updates.subject && !existing) {
        // 기본 시간표엔 없지만 교환으로 채워진 칸이라면, 그 기록을 지워 빈 칸으로 되돌린다.
        await clearWeeklyOverridesFor(day, period, period)
        return
      }

      if (!updates.subject && existing) {
        const { error } = await deleteTimetableEntry(existing.id)
        if (error) {
          alert("시간표를 지우지 못했습니다: " + error.message)
          return
        }
        // 프로필을 먼저 정리해야 뒤이은 loadTimetable이 옛 값을 다시 읽어오지 않는다.
        await clearWeeklyOverridesFor(day, existing.start_period, existing.end_period)
        await loadTimetable()
        window.dispatchEvent(new Event("timetable-change"))
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
        is_class: tab === "class",
      }
      if (existing?.id) entry.id = existing.id

      const { error } = await upsertTimetableEntry(entry)
      if (error) {
        alert("시간표를 저장하지 못했습니다: " + error.message)
        return
      }

      // 블록타임을 한 칸으로 줄인 경우까지 감안해 예전 범위도 함께 정리한다.
      const clearUntil = Math.max(entry.end_period, existing?.end_period ?? entry.end_period)
      await clearWeeklyOverridesFor(day, entry.start_period, clearUntil)
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

      if (!swapMode) {
        const prevPeriod = visiblePeriods[row - 2]?.originalIndex
        if (prevPeriod && getGroupKey(day, prevPeriod) && getGroupKey(day, prevPeriod) === getGroupKey(day, period)) {
          continue
        }
      }

      const entry = swapMode ? getCellEntry(day, period) : getEffectiveEntry(cellKey)
      const span = !swapMode && entry ? getSpan(day, row - 1) : 1
      const isEditing = editingCell === cellKey
      const isSelected = swapMode && selectedCell === cellKey
      // 블록타임은 '다음 교시'가 아니라 '화면에 보이는 다음 교시'와 묶어야 한다.
      const nextPeriod = visiblePeriods[row]?.originalIndex ?? null

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
          period={period}
          nextPeriod={nextPeriod}
          isOverride={weeklyOverrides[cellKey] !== undefined}
          isToday={isToday}
        />
      )
    }
  }

  const hasOverrides = Object.keys(weeklyOverrides).length > 0

  return (
    <div className="bg-widjet rounded-2xl p-7 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-baseline gap-3">
          <button
            onClick={() => { setTab("personal"); setSwapMode(false); setSelectedCell(null) }}
            className={`text-[clamp(0.9rem,1vw,1.25rem)] font-semibold transition-colors ${
              tab === "personal" ? "text-gray-900" : "text-gray-300 hover:text-gray-500"
            }`}
          >
            내 시간표
          </button>
          {homeroomClass && (
            <button
              onClick={() => { setTab("class"); setSwapMode(false); setSelectedCell(null) }}
              className={`text-[clamp(0.8rem,0.9vw,1.1rem)] font-semibold transition-colors ${
                tab === "class" ? "text-gray-900" : "text-gray-300 hover:text-gray-500"
              }`}
            >
              학급 시간표
              <span className="ml-1 text-[clamp(0.55rem,0.65vw,0.75rem)] font-medium opacity-70">
                {homeroomClass}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 편집 모드 밖에서도 보여야 한다. 이번주만 바꾼 칸이 남아 있는 줄 모르면
              새로 입력한 과목이 왜 안 보이는지 알 길이 없다. */}
          {hasOverrides && (
            <button
              onClick={handleResetWeekly}
              title="이번주만 바꾼 칸을 원래 시간표로 되돌립니다"
              className="text-[clamp(0.5rem,0.6vw,0.7rem)] text-gray-400 hover:text-red-500 transition-colors"
            >
              ↺ 이번주 변경
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
