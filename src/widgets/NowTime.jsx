import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchTimetable } from "../api/timetable"
import { fetchProfileRow } from "../api/settings"
import {
  DEFAULT_PERIOD_SCHEDULE, DEFAULT_WORK_END_TIME, AFTERSCHOOL_START,
  timeToMin, mergePeriodSchedule, getEnabledPeriods,
  findCurrentPeriod, buildBreakSlots, getWeeklyOverrides, resolveEntry,
} from "../lib/periods"

// === 테스트용: 원하는 시간/요일로 변경 후 확인 ===
const DEBUG_TIME = null  // "HH:MM" 형식, null이면 실제 시간 사용
const DEBUG_DAY = null        // 1=월 ~ 5=금, null이면 실제 요일 사용
// ===============================================

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
  const [classEntries, setClassEntries] = useState([])
  const [homeroomClass, setHomeroomClass] = useState(null)
  const [tick, setTick] = useState(0)
  const [PERIOD_SCHEDULE, setPeriodSchedule] = useState(DEFAULT_PERIOD_SCHEDULE)
  const [workEndTime, setWorkEndTime] = useState(DEFAULT_WORK_END_TIME)
  const [weeklyOverrides, setWeeklyOverrides] = useState({})
  const [classOverrides, setClassOverrides] = useState({})

  const loadData = useCallback(async () => {
    if (!user) return
    const [ttResult, classResult, profileResult] = await Promise.all([
      fetchTimetable(user.id, false),
      fetchTimetable(user.id, true),
      fetchProfileRow(user.id),
    ])
    if (ttResult.data) setEntries(ttResult.data)
    if (classResult.data) setClassEntries(classResult.data)
    if (profileResult.data) {
      setHomeroomClass(profileResult.data.homeroom_class || null)
      setWorkEndTime(profileResult.data.work_end_time || DEFAULT_WORK_END_TIME)
      const wt = getWeeklyOverrides(profileResult.data.weekly_timetable)
      setWeeklyOverrides(wt.map)
      setClassOverrides(wt.classMap)
      setPeriodSchedule(mergePeriodSchedule(profileResult.data.period_schedule))
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


  const enabledPeriods = getEnabledPeriods(PERIOD_SCHEDULE)
  const enabledIndexes = new Set(enabledPeriods.map((p) => p.index))
  const BREAK_SLOTS = buildBreakSlots(enabledPeriods)

  const today = DEBUG_DAY ?? new Date().getDay()
  const dayIndex = today >= 1 && today <= 5 ? today : 0
  const todayEntries = entries.filter((e) => e.day === dayIndex)

  const current = DEBUG_TIME ? timeToMin(DEBUG_TIME) : nowMin()
  const isWeekend = dayIndex === 0

  const activeSlot = findCurrentPeriod(enabledPeriods, current)
  const activePeriod = activeSlot?.index ?? null
  const activePeriodLabel = activeSlot?.label ?? ""

  const activeBreak = BREAK_SLOTS.find(
    (b) => current >= timeToMin(b.start) && current < timeToMin(b.end)
  ) ?? null

  const activeEntry = activePeriod
    ? resolveEntry(todayEntries, weeklyOverrides, dayIndex, activePeriod)
    : null

  const todayClassEntries = classEntries.filter((e) => e.day === dayIndex)
  const activeClassEntry = activePeriod
    ? resolveEntry(todayClassEntries, classOverrides, dayIndex, activePeriod)
    : null

  let classLineText = ""
  if (homeroomClass && !isWeekend && activePeriod) {
    if (activeClassEntry) {
      const subj = activeClassEntry.subject || ""
      const room = activeClassEntry.room || ""
      classLineText = `${subj}${room ? ` (${room})` : ""}`
    } else {
      classLineText = "수업 없음"
    }
  }

  // 방과후가 시간표에 남아 있어도 설정에서 비활성화되어 있으면 퇴근 시간에 반영하지 않는다.
  const latestAfterSchoolPeriod = todayEntries.reduce((max, e) => {
    const ep = e.end_period ?? e.start_period
    if (!enabledIndexes.has(ep)) return max
    return ep >= AFTERSCHOOL_START && ep > max ? ep : max
  }, 0)

  let endOfDayMin = timeToMin(workEndTime || DEFAULT_WORK_END_TIME)
  if (latestAfterSchoolPeriod > 0 && PERIOD_SCHEDULE[latestAfterSchoolPeriod]) {
    endOfDayMin = timeToMin(PERIOD_SCHEDULE[latestAfterSchoolPeriod].end)
  }
  const remainingMin = endOfDayMin - current
  const noMoreClasses = current >= endOfDayMin

  const dayStartMin = timeToMin(enabledPeriods[0]?.start || DEFAULT_PERIOD_SCHEDULE[1].start)
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
    bigText = `${activePeriodLabel} 공강`
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  } else {
    const subj = activeEntry.subject || "공강"
    const room = activeEntry.room || ""
    bigText = `${activePeriodLabel} ${subj}${room ? ` ${room}` : ""}`
    bottomMsg = `오늘 퇴근까지 ${formatRemaining(remainingMin)} 남았어요.`
  }

  return (
    <div className="bg-widjet rounded-2xl p-7">
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">지금 이 시각</p>
      <p className="text-[clamp(1.3rem,1.8vw,2rem)] font-extrabold mt-2">{bigText}</p>
      {classLineText && (
        <p className="text-[clamp(0.7rem,0.8vw,1rem)] text-gray-500 mt-1">
          <span className="text-gray-400">{homeroomClass} 학급:</span> {classLineText}
        </p>
      )}
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
