import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchTimetable } from "../api/timetable"
import { fetchProfileRow } from "../api/settings"

const DEFAULT_PERIOD_SCHEDULE = [
  null,
  { label: "1교시", start: "08:20", end: "09:10", enabled: true },
  { label: "2교시", start: "09:20", end: "10:10", enabled: true },
  { label: "3교시", start: "10:20", end: "11:10", enabled: true },
  { label: "4교시", start: "11:20", end: "12:10", enabled: true },
  { label: "점심시간", start: "12:10", end: "13:00", enabled: true },
  { label: "5교시", start: "13:00", end: "13:50", enabled: true },
  { label: "6교시", start: "14:00", end: "14:50", enabled: true },
  { label: "7교시", start: "15:00", end: "15:50", enabled: true },
  { label: "방과후 A", start: "16:30", end: "17:20", enabled: false },
  { label: "방과후 B", start: "18:20", end: "20:00", enabled: false },
]

const DEFAULT_END = "16:00"

function buildBreakSlots(schedule) {
  const breaks = []
  for (let i = 1; i < schedule.length - 1; i++) {
    const cur = schedule[i]
    const next = schedule[i + 1]
    if (!cur || !next) continue
    if (cur.end !== next.start) {
      const label = cur.label === "점심시간" || next.label === "점심시간" ? "점심시간" :
        i >= 9 ? "석식시간" : "쉬는 시간"
      breaks.push({ start: cur.end, end: next.start, label })
    }
  }
  return breaks
}

// === 테스트용: 원하는 시간/요일로 변경 후 확인 ===
const DEBUG_TIME = null  // "HH:MM" 형식, null이면 실제 시간 사용
const DEBUG_DAY = null        // 1=월 ~ 5=금, null이면 실제 요일 사용
// ===============================================

function timeToMin(str) {
  const [h, m] = str.split(":").map(Number)
  return h * 60 + m
}

function nowMin() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function formatRemaining(min) {
  if (min <= 0) return "00:00"
  const h = String(Math.floor(min / 60)).padStart(2, "0")
  const m = String(min % 60).padStart(2, "0")
  return `${h}시간 ${m}분`
}

export default function NowTime() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [tick, setTick] = useState(0)
  const [PERIOD_SCHEDULE, setPeriodSchedule] = useState(DEFAULT_PERIOD_SCHEDULE)

  const loadData = useCallback(async () => {
    if (!user) return
    const [ttResult, profileResult] = await Promise.all([
      fetchTimetable(user.id),
      fetchProfileRow(user.id),
    ])
    if (ttResult.data) setEntries(ttResult.data)
    if (profileResult.data?.period_schedule) {
      const saved = profileResult.data.period_schedule
      if (Array.isArray(saved) && saved.length > 0) {
        const merged = DEFAULT_PERIOD_SCHEDULE.slice(1).map((def, i) => ({
          label: def.label,
          start: saved[i]?.start || def.start,
          end: saved[i]?.end || def.end,
          enabled: saved[i]?.enabled ?? def.enabled,
        }))
        setPeriodSchedule([null, ...merged])
      }
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handleChange = () => loadData()
    window.addEventListener("timetable-change", handleChange)
    return () => window.removeEventListener("timetable-change", handleChange)
  }, [loadData])

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])


  const enabledSchedule = [null, ...PERIOD_SCHEDULE.slice(1).filter((p) => p?.enabled !== false)]
  const BREAK_SLOTS = buildBreakSlots(enabledSchedule)

  const today = DEBUG_DAY ?? new Date().getDay()
  const dayIndex = today >= 1 && today <= 5 ? today : 0
  const todayEntries = entries.filter((e) => e.day === dayIndex)

  const current = DEBUG_TIME ? timeToMin(DEBUG_TIME) : nowMin()
  const isWeekend = dayIndex === 0

  let activePeriod = null
  for (let p = 1; p < enabledSchedule.length; p++) {
    const s = enabledSchedule[p]
    if (current >= timeToMin(s.start) && current < timeToMin(s.end)) {
      activePeriod = p
      break
    }
  }

  let activeBreak = null
  for (const b of BREAK_SLOTS) {
    if (current >= timeToMin(b.start) && current < timeToMin(b.end)) {
      activeBreak = b
      break
    }
  }

  const activeEntry = activePeriod
    ? todayEntries.find((e) => activePeriod >= e.start_period && activePeriod <= e.end_period)
    : null

  const AFTERSCHOOL_START = 9
  const latestAfterSchoolPeriod = todayEntries.reduce((max, e) => {
    const ep = e.end_period ?? e.start_period
    return ep >= AFTERSCHOOL_START && ep > max ? ep : max
  }, 0)

  let endOfDayMin = timeToMin(DEFAULT_END)
  if (latestAfterSchoolPeriod > 0 && PERIOD_SCHEDULE[latestAfterSchoolPeriod]) {
    endOfDayMin = timeToMin(PERIOD_SCHEDULE[latestAfterSchoolPeriod].end)
  }
  const remainingMin = endOfDayMin - current
  const noMoreClasses = current >= endOfDayMin

  const dayStartMin = timeToMin(enabledSchedule[1].start)
  let progress = 0
  if (!isWeekend && current >= dayStartMin && endOfDayMin > dayStartMin) {
    progress = Math.min(Math.max((current - dayStartMin) / (endOfDayMin - dayStartMin), 0), 1)
  }

  let bigText = ""
  let bottomMsg = ""

  if (isWeekend) {
    bigText = "오늘은 쉬는 날"
    bottomMsg = "월요일에 만나요!"
  } else if (noMoreClasses) {
    bigText = "얼른 퇴근하세요!"
    bottomMsg = "수고하셨습니다♥"
  } else if (current < dayStartMin) {
    bigText = "오늘 하루도 화이팅!"
    bottomMsg = "좋은 하루 되세요 :)"
  } else if (activeBreak) {
    bigText = activeBreak.label === "석식시간" ? "석식시간" : "쉬는 시간"
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  } else if (!activePeriod) {
    bigText = "쉬는 시간"
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  } else if (!activeEntry) {
    bigText = `${enabledSchedule[activePeriod].label} 공강`
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  } else {
    const subj = activeEntry.subject || "공강"
    const room = activeEntry.room || ""
    bigText = `${enabledSchedule[activePeriod].label} ${subj}${room ? ` ${room}` : ""}`
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  }

  return (
    <div className="bg-widjet rounded-2xl p-7">
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">지금 이 시각</p>
      <p className="text-[clamp(1.3rem,1.8vw,2rem)] font-extrabold mt-2">{bigText}</p>
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-3">
        <p className="text-[clamp(0.7rem,0.75vw,0.95rem)] text-primary">{bottomMsg}</p>
      </div>
    </div>
  )
}
