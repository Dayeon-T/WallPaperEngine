import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchProfileRow } from "../api/settings"
import { joinPresence } from "../api/cheers"
import Login from "../widgets/Login"
import Profile from "../widgets/Profile"
import Clock from "../widgets/Clock"
import Weather from "../widgets/Weather"
import Timetable from "../widgets/Timetable"
import NowTime from "../widgets/NowTime"
import ToDo from "../widgets/ToDo"
import SchoolMeals from "../widgets/SchoolMeals"
import Schedule from "../widgets/Schedule"
import BirthdayOverlay from "../widgets/Components/BirthdayOverlay"
import CheerToast from "../widgets/Components/CheerToast"
import CheerButton from "../widgets/CheerButton"
import Folders from "../widgets/Folders"

function getDDayDiff(targetDate) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDDayLabel(diff) {
  if (diff === 0) return "D-Day!"
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function DDayBadge() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])

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

  const sorted = [...events].sort((a, b) =>
    Math.abs(getDDayDiff(a.date)) - Math.abs(getDDayDiff(b.date))
  )

  if (!sorted.length) return null

  return (
    <div className="fixed top-12 left-[53%] -translate-x-1/2 z-50 grid grid-cols-2 gap-2">
      {sorted.map((ev) => {
        const diff = getDDayDiff(ev.date)
        return (
          <div
            key={ev.id}
            className="bg-white/70 backdrop-blur-md shadow-sm rounded-xl px-3 py-2 flex items-center gap-2 min-w-0"
          >
            <span className="text-sm shrink-0">{ev.emoji || "📅"}</span>
            <span className="text-[clamp(0.55rem,0.65vw,0.75rem)] font-medium text-gray-600 truncate">
              {ev.title}
            </span>
            <span className={`text-[clamp(0.55rem,0.65vw,0.75rem)] font-bold shrink-0 ${
              diff === 0 ? "text-red-500" : "text-primary"
            }`}>
              {formatDDayLabel(diff)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function isBirthdayToday(user) {
  const birthday = user?.user_metadata?.birthday
  if (!birthday) return false
  const [, m, d] = birthday.split("-")
  const now = new Date()
  return now.getMonth() + 1 === Number(m) && now.getDate() === Number(d)
}

export default function GridLayout() {
  const { user, loading } = useAuth()
  const [showBirthday, setShowBirthday] = useState(false)
  const [layoutMode, setLayoutMode] = useState("horizontal")

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.layout_mode) setLayoutMode(data.layout_mode)
    })()
  }, [user])

  useEffect(() => {
    const handler = (e) => setLayoutMode(e.detail)
    window.addEventListener("layout-change", handler)
    return () => window.removeEventListener("layout-change", handler)
  }, [])

  useEffect(() => {
    if (!user) return
    const leave = joinPresence(user)
    return leave
  }, [user])

  useEffect(() => {
    if (!user || !isBirthdayToday(user)) return
    const key = `birthday_shown_${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    setShowBirthday(true)
  }, [user])

  const isVertical = layoutMode === "vertical"

  if (isVertical) {
    return (
      <>
        <DDayBadge />
        <CheerToast />
        <div className="h-full flex flex-col justify-end gap-[1.5vw]">
          {showBirthday && (
            <BirthdayOverlay userName={user?.user_metadata?.name || "선생님"} />
          )}
          <div className="grid grid-cols-2 gap-[1.5vw] shrink-0">
            <div>
              {loading ? null : user ? <Profile /> : <Login />}
            </div>
            <div className="flex items-start gap-7">
              <Clock />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[1.5vw] shrink-0">
            <div>
              <CheerButton />
            </div>
            <Weather />
          </div>
          <div className="grid grid-cols-2 gap-[1.5vw] shrink-0">
            <Folders />
            <Timetable />
          </div>
          <div className="grid grid-cols-2 gap-[1.5vw] shrink-0">
            <div className="flex flex-col gap-[1.5vw]">
              <NowTime />
              <ToDo />
            </div>
            <div className="flex flex-col gap-[1.5vw]">
              <SchoolMeals />
              <Schedule />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
    <DDayBadge />
    <CheerToast />
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] grid-rows-[auto_minmax(0,1fr)] gap-[1.5vw]">
      {showBirthday && (
        <BirthdayOverlay userName={user?.user_metadata?.name || "선생님"} />
      )}
      <div className="row-span-2 flex flex-col gap-[1.5vw]">
        <div>{loading ? null : user ? <Profile /> : <Login />}</div>
        <div className="flex-1"><Folders /></div>
      </div>
      <div className="flex items-start gap-7">
        <Clock />
      </div>
      <div>
        <CheerButton />
      </div>
      <Weather />
      <Timetable />
      <div className="h-full flex flex-col gap-7">
        <NowTime />
        <div className="flex-1">
          <ToDo />
        </div>
      </div>
      <div className="h-full flex flex-col gap-7">
        <SchoolMeals />
        <div className="flex-1">
          <Schedule />
        </div>
      </div>
    </div>
    </>
  )
}
