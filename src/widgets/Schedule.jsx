import { useState, useEffect, useCallback } from "react"
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

export default function Schedule() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [weekLabel, setWeekLabel] = useState("")

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

      const now = new Date()
      const monday = getMonday(now)
      monday.setDate(monday.getDate() + weekOffset * 7)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      const mondayStr = formatYmd(monday)
      const sundayStr = formatYmd(sunday)

      setWeekLabel(getWeekLabel(monday))

      const [neisRes, customRes] = await Promise.all([
        fetch(
          `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=100` +
          `&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}` +
          `&AA_FROM_YMD=${mondayStr}&AA_TO_YMD=${sundayStr}`
        ).then(r => r.json()),
        fetchSchoolEvents(atptCode, schoolCode),
      ])

      const neisRows = neisRes.SchoolSchedule?.[1]?.row ?? []
      const neisMapped = neisRows
        .filter((r) => r.EVENT_NM !== "토요휴업일")
        .map((r) => ({
          date: r.AA_YMD,
          day: Number(r.AA_YMD.slice(6)),
          name: r.EVENT_NM,
          source: "neis",
        }))

      const customFiltered = (customRes.data || [])
        .filter(e => {
          const start = e.date
          const end = e.end_date || e.date
          return start <= sundayStr && end >= mondayStr
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
  }, [weekOffset, atptCode, schoolCode])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  useEffect(() => {
    const handler = () => fetchSchedule()
    window.addEventListener("school-events-change", handler)
    return () => window.removeEventListener("school-events-change", handler)
  }, [fetchSchedule])

  if (!atptCode || !schoolCode) {
    return (
      <div className="h-full bg-widjet rounded-2xl p-7 flex flex-col">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">학사일정</p>
        <p className="mt-4 text-sm text-muted">학교 정보를 설정해주세요.</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-widjet rounded-2xl p-7 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">학사일정</p>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="hover:opacity-60 transition-opacity"
          >
            ◀
          </button>
          <span className="min-w-[5em] text-center font-medium">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="hover:opacity-60 transition-opacity"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 overflow-y-auto flex-1">
        {loading && <p className="text-sm text-muted">불러오는 중...</p>}
        {error && <p className="text-sm text-muted">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-muted">이번 주 학사일정이 없습니다.</p>
        )}

        {!loading &&
          !error &&
          events.map((ev, i) => {
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
    </div>
  )
}
