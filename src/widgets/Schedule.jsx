import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import { NEIS_KEY } from "../api/neis"
import { fetchSchoolEvents } from "../api/schoolEvents"

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function getWeekLabel(monday) {
  const thursday = new Date(monday)
  thursday.setDate(thursday.getDate() + 3)

  const month = thursday.getMonth()
  const year = thursday.getFullYear()

  const firstOfMonth = new Date(year, month, 1)
  const firstThursday = new Date(getMonday(firstOfMonth))
  firstThursday.setDate(firstThursday.getDate() + 3)
  if (firstThursday.getMonth() < month)
    firstThursday.setDate(firstThursday.getDate() + 7)

  const diff = Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  const week = diff + 1

  return `${month + 1}월 ${week}주`
}

function getCalendarGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDayOfWeek = first.getDay()
  const startDate = new Date(first)
  startDate.setDate(startDate.getDate() - startDayOfWeek)
  const days = []
  for (let i = 0; i < 35; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

export default function Schedule() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [periodLabel, setPeriodLabel] = useState("")
  const [currentMonthInfo, setCurrentMonthInfo] = useState({ year: 0, month: 0 })

  const atptCode = user?.user_metadata?.atpt_code
  const schoolCode = user?.user_metadata?.school_code

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatYmd(today)

  const fetchSchedule = useCallback(async () => {
    if (!atptCode || !schoolCode) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")

      let fromStr, toStr, label
      if (viewMode === "week") {
        const now = new Date()
        const monday = getMonday(now)
        monday.setDate(monday.getDate() + weekOffset * 7)
        const sunday = new Date(monday)
        sunday.setDate(sunday.getDate() + 6)
        fromStr = formatYmd(monday)
        toStr = formatYmd(sunday)
        label = getWeekLabel(monday)
      } else {
        const now = new Date()
        const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
        const year = target.getFullYear()
        const month = target.getMonth()
        const gridStart = new Date(year, month, 1)
        gridStart.setDate(1 - gridStart.getDay())
        const gridEnd = new Date(gridStart)
        gridEnd.setDate(gridEnd.getDate() + 34)
        fromStr = formatYmd(gridStart)
        toStr = formatYmd(gridEnd)
        label = `${year}년 ${month + 1}월`
        setCurrentMonthInfo({ year, month })
      }

      setPeriodLabel(label)

      const [neisRes, customRes] = await Promise.all([
        fetch(
          `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=500` +
          `&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}` +
          `&AA_FROM_YMD=${fromStr}&AA_TO_YMD=${toStr}`
        ).then(r => r.json()),
        fetchSchoolEvents(atptCode, schoolCode),
      ])

      const neisRows = neisRes.SchoolSchedule?.[1]?.row ?? []
      const neisMapped = neisRows
        .filter((r) => r.EVENT_NM !== "토요휴업일")
        .map((r) => ({
          date: r.AA_YMD,
          end_date: null,
          day: Number(r.AA_YMD.slice(6)),
          name: r.EVENT_NM,
          source: "neis",
        }))

      const customFiltered = (customRes.data || [])
        .filter(e => {
          const start = e.date
          const end = e.end_date || e.date
          return start <= toStr && end >= fromStr
        })
        .map(e => ({
          date: e.date,
          end_date: e.end_date || null,
          day: Number(e.date.slice(6)),
          name: e.name,
          source: "custom",
        }))

      const merged = [...neisMapped, ...customFiltered]
        .filter((v, i, a) => a.findIndex(t => t.date === v.date && t.name === v.name) === i)
        .sort((a, b) => a.date.localeCompare(b.date))

      setEvents(merged)
    } catch (e) {
      console.error(e)
      setError("학사일정을 불러올 수 없습니다.")
    } finally {
      setLoading(false)
    }
  }, [viewMode, weekOffset, monthOffset, atptCode, schoolCode])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  useEffect(() => {
    const handler = () => fetchSchedule()
    window.addEventListener("school-events-change", handler)
    return () => window.removeEventListener("school-events-change", handler)
  }, [fetchSchedule])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const ev of events) {
      const start = ev.date
      const end = ev.end_date || ev.date
      const startD = new Date(
        Number(start.slice(0, 4)),
        Number(start.slice(4, 6)) - 1,
        Number(start.slice(6, 8))
      )
      const endD = new Date(
        Number(end.slice(0, 4)),
        Number(end.slice(4, 6)) - 1,
        Number(end.slice(6, 8))
      )
      const cur = new Date(startD)
      while (cur <= endD) {
        const key = formatYmd(cur)
        if (!map[key]) map[key] = []
        map[key].push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  if (!atptCode || !schoolCode) {
    return (
      <div className="h-full bg-widjet rounded-2xl p-7 flex flex-col">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">학사일정</p>
        <p className="mt-4 text-sm text-muted">학교 정보를 설정해주세요.</p>
      </div>
    )
  }

  const handlePrev = () => {
    if (viewMode === "week") setWeekOffset(p => p - 1)
    else setMonthOffset(p => p - 1)
  }
  const handleNext = () => {
    if (viewMode === "week") setWeekOffset(p => p + 1)
    else setMonthOffset(p => p + 1)
  }

  const calendarDays = viewMode === "month"
    ? getCalendarGrid(currentMonthInfo.year, currentMonthInfo.month)
    : []

  return (
    <div className="h-full bg-widjet rounded-2xl p-7 flex flex-col min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">학사일정</p>
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => { setViewMode("week"); setWeekOffset(0) }}
              className={`text-[clamp(0.5rem,0.6vw,0.7rem)] px-2 py-1 rounded-lg transition-colors ${
                viewMode === "week" ? "bg-primary text-white" : "text-muted hover:bg-gray-100"
              }`}
            >
              주간
            </button>
            <button
              onClick={() => { setViewMode("month"); setMonthOffset(0) }}
              className={`text-[clamp(0.5rem,0.6vw,0.7rem)] px-2 py-1 rounded-lg transition-colors ${
                viewMode === "month" ? "bg-primary text-white" : "text-muted hover:bg-gray-100"
              }`}
            >
              월간
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={handlePrev} className="hover:opacity-60 transition-opacity">◀</button>
          <span className="min-w-[6em] text-center font-medium">{periodLabel}</span>
          <button onClick={handleNext} className="hover:opacity-60 transition-opacity">▶</button>
        </div>
      </div>

      {viewMode === "week" && (
        <div className="mt-4 flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
          {loading && <p className="text-sm text-muted">불러오는 중...</p>}
          {error && <p className="text-sm text-muted">{error}</p>}

          {!loading && !error && events.length === 0 && (
            <p className="text-sm text-muted">이번 주 학사일정이 없습니다.</p>
          )}

          {!loading && !error && events.map((ev, i) => {
            const isToday = ev.date === todayStr
            const hasRange = ev.end_date && ev.end_date !== ev.date
            const dayLabel = hasRange
              ? `${ev.day}~${Number(ev.end_date.slice(6))}`
              : ev.day
            return (
              <div
                key={`${ev.date}-${i}`}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                  isToday ? "" : "bg-white/60 text-gray-800"
                }`}
                style={isToday ? {
                  backgroundColor: "var(--schedule-today-bg, #3B3B3B)",
                  color: "var(--schedule-today-text, #FFFFFF)",
                } : undefined}
              >
                <span
                  className={`font-bold min-w-[2em] text-center ${
                    hasRange ? "text-base" : "text-xl"
                  }`}
                  style={isToday ? { color: "var(--schedule-today-text, #FFFFFF)" } : { color: "#374151" }}
                >
                  {dayLabel}
                </span>
                <span className="text-sm font-medium truncate">{ev.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === "month" && (
        <div className="mt-3 flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-7 gap-1 text-[clamp(0.55rem,0.65vw,0.75rem)] text-center text-muted mb-1 shrink-0">
            {["일","월","화","수","목","금","토"].map((d, i) => (
              <div key={d} className={i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}>{d}</div>
            ))}
          </div>

          {loading && <p className="text-sm text-muted">불러오는 중...</p>}
          {error && <p className="text-sm text-muted">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-7 grid-rows-5 gap-1 flex-1 min-h-0">
              {calendarDays.map((d, i) => {
                const dStr = formatYmd(d)
                const isCurrentMonth = d.getMonth() === currentMonthInfo.month
                const isToday = dStr === todayStr
                const dow = d.getDay()
                const dayEvents = eventsByDate[dStr] || []

                return (
                  <div
                    key={i}
                    className={`flex flex-col rounded-md p-1 overflow-hidden ${
                      isCurrentMonth ? "bg-white/60" : "bg-white/20"
                    }`}
                    style={isToday ? {
                      backgroundColor: "var(--schedule-today-bg, #3B3B3B)",
                      color: "var(--schedule-today-text, #FFFFFF)",
                    } : undefined}
                  >
                    <span
                      className="text-[clamp(0.55rem,0.65vw,0.75rem)] font-semibold leading-tight"
                      style={
                        isToday
                          ? { color: "var(--schedule-today-text, #FFFFFF)" }
                          : !isCurrentMonth
                            ? { color: "#9CA3AF" }
                            : dow === 0
                              ? { color: "#F87171" }
                              : dow === 6
                                ? { color: "#60A5FA" }
                                : { color: "#374151" }
                      }
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-px mt-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <span
                          key={j}
                          className="text-[clamp(0.45rem,0.55vw,0.6rem)] truncate leading-tight"
                          style={isToday ? { color: "var(--schedule-today-text, #FFFFFF)" } : { color: "#4B5563" }}
                          title={ev.name}
                        >
                          • {ev.name}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span
                          className="text-[clamp(0.45rem,0.5vw,0.55rem)] leading-tight"
                          style={isToday ? { color: "var(--schedule-today-text, #FFFFFF)" } : { color: "#9CA3AF" }}
                        >
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
