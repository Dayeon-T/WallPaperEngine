import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { fetchBoardView } from "../api/board"
import { NEIS_KEY } from "../api/neis"
import {
  mergePeriodSchedule, getEnabledPeriods, findCurrentPeriod,
  buildBreakSlots, getWeeklyOverrides, resolveEntry, timeToMin,
} from "../lib/periods"

// 칠판이 재부팅 후에도 같은 학급으로 복귀하도록 코드를 기기에 저장한다.
const CODE_KEY = "board_code"
// 3단계(Realtime broadcast) 전까지는 폴링으로 변경사항을 반영한다.
const REFRESH_MS = 60000

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function getWeekRange(now) {
  const monday = new Date(now)
  const dow = monday.getDay()
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow))
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return { from: formatYmd(monday), to: formatYmd(sunday) }
}

export default function Board() {
  // loading | input | connected — 저장된 코드가 있으면 자동 복귀를 시도한다
  const [phase, setPhase] = useState(() => (localStorage.getItem(CODE_KEY) ? "loading" : "input"))
  const [view, setView] = useState(null)
  const [codeInput, setCodeInput] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [now, setNow] = useState(new Date())

  // 칠판은 공용 기기다. 이 브라우저에 교사 세션이 남아 있으면
  // (실수로 로그인했던 경우 포함) 칠판 화면에 들어오는 순간 지운다.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) await supabase.auth.signOut()
    })()
  }, [])

  const connect = useCallback(async (code, { silent = false } = {}) => {
    const normalized = (code || "").trim().toUpperCase()
    if (normalized.length !== 6) {
      if (!silent) setErrorMsg("6자리 코드를 입력해주세요.")
      return false
    }
    setConnecting(true)
    const { data, error } = await fetchBoardView(normalized)
    setConnecting(false)
    if (error) {
      // 일시적 네트워크 오류: 이미 연결된 화면은 마지막 데이터를 유지한다
      if (!silent) setErrorMsg("연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
      setPhase((p) => (p === "connected" ? p : "input"))
      return false
    }
    if (!data) {
      // 코드가 무효(재발급·연결 끊기·담임 해제) → 연결 화면으로
      localStorage.removeItem(CODE_KEY)
      if (!silent) setErrorMsg("코드를 찾을 수 없습니다. 다시 확인해주세요.")
      setView(null)
      setPhase("input")
      return false
    }
    localStorage.setItem(CODE_KEY, normalized)
    setView(data)
    setErrorMsg("")
    setPhase("connected")
    return true
  }, [])

  // 저장된 코드가 있으면 자동 복귀
  useEffect(() => {
    const saved = localStorage.getItem(CODE_KEY)
    if (saved) connect(saved, { silent: true })
  }, [connect])

  // 연결 중에는 주기적으로 다시 읽어 시간표·공지 변경을 반영한다
  useEffect(() => {
    if (phase !== "connected") return
    const timer = setInterval(() => {
      const saved = localStorage.getItem(CODE_KEY)
      if (saved) connect(saved, { silent: true })
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [phase, connect])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!connecting) connect(codeInput)
  }

  const disconnect = () => {
    localStorage.removeItem(CODE_KEY)
    setView(null)
    setCodeInput("")
    setPhase("input")
  }

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-2xl">연결 중...</p>
      </div>
    )
  }

  if (phase === "input") {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-lg px-8 text-center">
          <p className="text-gray-400 text-xl mb-2">PLANSCHOOL 교실 화면</p>
          <h1 className="text-white text-4xl font-extrabold mb-10">교실 코드를 입력해주세요</h1>
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                setErrorMsg("")
              }}
              placeholder="ABC123"
              className="w-80 rounded-2xl bg-gray-800 border-2 border-gray-700 px-6 py-5 text-center text-4xl font-extrabold tracking-[0.3em] text-white placeholder-gray-600 outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={connecting || codeInput.length !== 6}
              className="w-80 rounded-2xl bg-blue-500 py-4 text-2xl font-bold text-white transition hover:bg-blue-400 disabled:opacity-40"
            >
              {connecting ? "확인 중..." : "연결하기"}
            </button>
          </form>
          {errorMsg && <p className="mt-6 text-xl text-red-400">{errorMsg}</p>}
          <p className="mt-10 text-lg text-gray-500">
            코드는 담임 선생님의 대시보드 → 설정 → 교실 화면에서 만들 수 있어요.
          </p>
        </div>
      </div>
    )
  }

  return <BoardScreen view={view} now={now} onDisconnect={disconnect} />
}

/* ───────── 연결된 칠판 화면 ───────── */

function BoardScreen({ view, now, onDisconnect }) {
  const day = now.getDay()
  const isSchoolDay = day >= 1 && day <= 5
  const currentMin = now.getHours() * 60 + now.getMinutes()

  const enabled = getEnabledPeriods(mergePeriodSchedule(view.period_schedule))
  const breaks = buildBreakSlots(enabled)
  const classOverrides = getWeeklyOverrides(view.weekly_timetable).classMap

  const slot = isSchoolDay ? findCurrentPeriod(enabled, currentMin) : null
  const activeBreak = isSchoolDay
    ? breaks.find((b) => currentMin >= timeToMin(b.start) && currentMin < timeToMin(b.end))
    : null

  let statusText = ""
  if (!isSchoolDay) {
    statusText = "즐거운 주말"
  } else if (slot) {
    statusText = slot.label === "점심시간" ? "점심시간" : `${slot.label} 수업 중`
  } else if (activeBreak) {
    statusText = activeBreak.label
  } else if (enabled.length > 0 && currentMin < timeToMin(enabled[0].start)) {
    statusText = "수업 전"
  } else if (enabled.length > 0 && currentMin >= timeToMin(enabled[enabled.length - 1].end)) {
    statusText = "수업 끝"
  } else {
    statusText = "쉬는 시간"
  }

  const todayEntries = (view.timetable || []).filter((e) => e.day === day)
  const rows = enabled.map((p) => ({
    ...p,
    entry: resolveEntry(todayEntries, classOverrides, day, p.index),
  }))

  const timeText = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
  const dateText = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_NAMES[day]})`

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* 상단 바: 학급명 · 날짜 · 시계 · 현재 교시 */}
      <div className="flex items-center justify-between px-[3vw] py-[1.2vw] border-b border-gray-800 shrink-0">
        <div className="flex items-baseline gap-[1.5vw]">
          <p className="text-[2.6vw] font-extrabold leading-none">{view.class_name}</p>
          <p className="text-[1.4vw] text-gray-400 leading-none">{dateText}</p>
        </div>
        <div className="flex items-baseline gap-[1.5vw]">
          <p className="text-[1.6vw] font-bold text-blue-300 leading-none">{statusText}</p>
          <p className="text-[2.6vw] font-extrabold tabular-nums leading-none">{timeText}</p>
        </div>
      </div>

      {/* 본문: 시간표(좌) + 급식·일정·D-Day(우) */}
      <div className="flex-1 min-h-0 grid grid-cols-[3fr_2fr] gap-[1.5vw] px-[3vw] py-[1.5vw]">
        <TimetablePane rows={rows} activeIndex={slot?.index ?? null} isSchoolDay={isSchoolDay} />
        <div className="min-h-0 flex flex-col gap-[1.2vw] overflow-hidden">
          <MealPane atptCode={view.atpt_code} schoolCode={view.school_code} now={now} />
          <EventsPane
            atptCode={view.atpt_code}
            schoolCode={view.school_code}
            customEvents={view.school_events || []}
            now={now}
          />
          <DDayPane events={view.dday_events || []} now={now} />
        </div>
      </div>

      {/* 공지: 있을 때만 하단에 크게 */}
      {view.notice && (
        <div className="shrink-0 bg-amber-400 text-gray-900 px-[3vw] py-[1vw]">
          <p className="text-[2vw] font-extrabold">📢 {view.notice}</p>
        </div>
      )}

      <button
        onClick={onDisconnect}
        className="absolute bottom-1 right-2 text-gray-700 text-xs hover:text-gray-500 transition-colors"
      >
        연결 해제
      </button>
    </div>
  )
}

function TimetablePane({ rows, activeIndex, isSchoolDay }) {
  if (!isSchoolDay) {
    return (
      <div className="min-h-0 rounded-2xl bg-gray-800/60 flex items-center justify-center">
        <p className="text-[2.4vw] font-extrabold text-gray-400">오늘은 쉬는 날 🎉</p>
      </div>
    )
  }
  return (
    <div className="min-h-0 rounded-2xl bg-gray-800/60 p-[1.5vw] flex flex-col overflow-hidden">
      <p className="text-[1.3vw] font-bold text-gray-400 mb-[1vw] shrink-0">오늘 시간표</p>
      <div className="flex-1 min-h-0 flex flex-col justify-evenly">
        {rows.map((p) => {
          const isActive = p.index === activeIndex
          const isLunch = p.label === "점심시간"
          return (
            <div
              key={p.index}
              className={`flex items-center gap-[1.2vw] rounded-xl px-[1.2vw] py-[0.4vw] ${
                isActive ? "bg-blue-500/90" : ""
              }`}
            >
              <span className={`w-[6.5vw] shrink-0 text-[1.5vw] font-bold ${isActive ? "text-white" : "text-gray-400"}`}>
                {isActive && "▶ "}{p.label}
              </span>
              {isLunch ? (
                <span className={`text-[1.7vw] font-bold ${isActive ? "text-white" : "text-gray-300"}`}>🍚</span>
              ) : (
                <>
                  <span className={`text-[1.9vw] font-extrabold ${p.entry?.subject ? "" : "text-gray-600"}`}>
                    {p.entry?.subject || "—"}
                  </span>
                  {p.entry?.room && (
                    <span className={`text-[1.3vw] ${isActive ? "text-blue-100" : "text-gray-400"}`}>
                      {p.entry.room}
                    </span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MealPane({ atptCode, schoolCode, now }) {
  const [dishes, setDishes] = useState(null)
  const ymd = formatYmd(now)

  useEffect(() => {
    if (!atptCode || !schoolCode) return
    let cancelled = false
    ;(async () => {
      try {
        const url =
          `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=10` +
          `&MLSV_YMD=${ymd}&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}`
        const res = await fetch(url)
        const data = await res.json()
        const rows = data.mealServiceDietInfo?.[1]?.row ?? []
        const lunch = rows.find((m) => m.MMEAL_SC_NM === "중식")
        if (!cancelled) {
          // 알레르기 표기 "(1.2.5)"는 원거리 가독성을 해쳐서 뗀다
          setDishes(lunch ? lunch.DDISH_NM.split("<br/>").map((d) => d.replace(/\s*\([\d.]+\)\s*/g, "").trim()) : [])
        }
      } catch {
        if (!cancelled) setDishes([])
      }
    })()
    return () => { cancelled = true }
  }, [atptCode, schoolCode, ymd])

  return (
    <div className="rounded-2xl bg-gray-800/60 p-[1.2vw] shrink-0">
      <p className="text-[1.3vw] font-bold text-gray-400 mb-[0.6vw]">오늘 급식</p>
      {!atptCode || !schoolCode ? (
        <p className="text-[1.2vw] text-gray-500">학교 정보가 설정되지 않았어요</p>
      ) : dishes === null ? (
        <p className="text-[1.2vw] text-gray-500">불러오는 중...</p>
      ) : dishes.length === 0 ? (
        <p className="text-[1.2vw] text-gray-500">오늘은 급식 정보가 없어요</p>
      ) : (
        <p className="text-[1.4vw] font-semibold leading-relaxed">{dishes.join(" · ")}</p>
      )}
    </div>
  )
}

function EventsPane({ atptCode, schoolCode, customEvents, now }) {
  const [neisEvents, setNeisEvents] = useState([])
  const { from, to } = getWeekRange(now)

  useEffect(() => {
    if (!atptCode || !schoolCode) return
    let cancelled = false
    ;(async () => {
      try {
        const url =
          `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=100` +
          `&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}` +
          `&AA_FROM_YMD=${from}&AA_TO_YMD=${to}`
        const res = await fetch(url)
        const data = await res.json()
        const rows = data.SchoolSchedule?.[1]?.row ?? []
        if (!cancelled) {
          setNeisEvents(
            rows
              .filter((r) => r.EVENT_NM !== "토요휴업일")
              .map((r) => ({ date: r.AA_YMD, end_date: null, name: r.EVENT_NM }))
          )
        }
      } catch {
        /* 학사일정은 없으면 없는 대로 둔다 */
      }
    })()
    return () => { cancelled = true }
  }, [atptCode, schoolCode, from, to])

  const thisWeek = [...neisEvents, ...customEvents]
    .filter((e) => e.date <= to && (e.end_date || e.date) >= from)
    .filter((v, i, a) => a.findIndex((t) => t.date === v.date && t.name === v.name) === i)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const fmt = (ymd) => `${Number(ymd.slice(4, 6))}/${Number(ymd.slice(6, 8))}`

  return (
    <div className="rounded-2xl bg-gray-800/60 p-[1.2vw] flex-1 min-h-0 overflow-hidden">
      <p className="text-[1.3vw] font-bold text-gray-400 mb-[0.6vw]">이번 주 일정</p>
      {thisWeek.length === 0 ? (
        <p className="text-[1.2vw] text-gray-500">이번 주 일정이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-[0.4vw]">
          {thisWeek.map((e, i) => (
            <li key={`${e.date}-${i}`} className="flex items-baseline gap-[0.8vw]">
              <span className="w-[4.5vw] shrink-0 text-[1.2vw] font-bold text-blue-300 tabular-nums">
                {fmt(e.date)}{e.end_date && e.end_date !== e.date ? `~${fmt(e.end_date)}` : ""}
              </span>
              <span className="text-[1.4vw] font-semibold truncate">{e.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DDayPane({ events, now }) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const upcoming = events
    .map((e) => ({
      ...e,
      diff: Math.ceil((new Date(e.date).setHours(0, 0, 0, 0) - today) / 86400000),
    }))
    .filter((e) => !Number.isNaN(e.diff) && e.diff >= 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2)

  if (upcoming.length === 0) return null

  return (
    <div className="rounded-2xl bg-gray-800/60 p-[1.2vw] shrink-0">
      <p className="text-[1.3vw] font-bold text-gray-400 mb-[0.6vw]">D-Day</p>
      <ul className="flex flex-col gap-[0.3vw]">
        {upcoming.map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-[1vw]">
            <span className="text-[1.4vw] font-semibold truncate">{e.title}</span>
            <span className="text-[1.6vw] font-extrabold text-amber-300 shrink-0">
              {e.diff === 0 ? "D-Day" : `D-${e.diff}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
