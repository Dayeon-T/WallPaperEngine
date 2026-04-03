import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { EDUCATION_OFFICES, searchSchools } from "../api/neis"
import {
  updateProfile,
  updatePassword,
  fetchProfileRow,
  upsertProfileRow,
  deleteOwnAccount,
} from "../api/settings"
import { signOut } from "../api/SignIn"
import { fetchSchoolEvents, addSchoolEvent, deleteSchoolEvent } from "../api/schoolEvents"
import DateDropdown from "../widgets/Components/DateDropdown"

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

const DEFAULT_QUICK_LINKS = [
  { name: "나이스", url: "https://sen.neis.go.kr/" },
  { name: "에듀파인", url: "https://klef.sen.go.kr/" },
  { name: "클래스룸", url: "https://classroom.google.com/" },
]

const BG_PRESETS = [
  "#F5F5F5", "#E8EAF6", "#E3F2FD", "#E0F2F1",
  "#F1F8E9", "#FFF8E1", "#FBE9E7", "#FCE4EC",
  "#F3E5F5", "#ECEFF1",
]

const SECTIONS = [
  { id: "profile", label: "프로필 수정" },
  { id: "password", label: "비밀번호 변경" },
  { id: "period", label: "교시 시간" },
  { id: "school-events", label: "학사일정 관리" },
  { id: "dday", label: "D-Day 관리" },
  { id: "quicklinks", label: "퀵링크" },
  { id: "background", label: "배경 설정" },
  { id: "widget-style", label: "위젯 꾸미기" },
  { id: "danger", label: "회원 탈퇴" },
]

const inputClass =
  "h-12 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const btnPrimary =
  "rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"

export default function Settings() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState("profile")
  const [msg, setMsg] = useState({ text: "", type: "" })

  const showMsg = (text, type = "success") => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: "", type: "" }), 3000)
  }

  if (!user) return null

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-[1.5vw]">
      <div />
      <div className="col-span-3 flex bg-white rounded-2xl overflow-hidden">
      <nav className="w-52 shrink-0 border-r border-gray-100 p-6 flex flex-col gap-1">
        <a href="/" className="text-xl font-black mb-8 block">DASHBOARD</a>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`text-left px-4 py-2.5 rounded-lg text-sm transition ${
              activeSection === s.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-10 overflow-y-auto">
        {msg.text && (
          <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            msg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {msg.text}
          </div>
        )}

        {activeSection === "profile" && (
          <ProfileSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "password" && (
          <PasswordSection showMsg={showMsg} />
        )}
        {activeSection === "period" && (
          <PeriodSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "school-events" && (
          <SchoolEventsSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "dday" && (
          <DDaySection user={user} showMsg={showMsg} />
        )}
        {activeSection === "quicklinks" && (
          <QuickLinksSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "background" && (
          <BackgroundSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "widget-style" && (
          <WidgetStyleSection user={user} showMsg={showMsg} />
        )}
        {activeSection === "danger" && (
          <DeleteAccountSection />
        )}
      </main>
      </div>
    </div>
  )
}

/* ───────── 섹션 1: 프로필 수정 ───────── */
function ProfileSection({ user, showMsg }) {
  const meta = user.user_metadata || {}
  const [name, setName] = useState(meta.name || "")
  const [atptCode, setAtptCode] = useState(meta.atpt_code || "")
  const [schoolCode, setSchoolCode] = useState(meta.school_code || "")
  const [schoolName, setSchoolName] = useState(meta.school_name || "")
  const [schoolQuery, setSchoolQuery] = useState(meta.school_name || "")
  const [schoolResults, setSchoolResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthDay, setBirthDay] = useState("")
  const [saving, setSaving] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (meta.birthday) {
      const [y, m, d] = meta.birthday.split("-")
      setBirthYear(y || "")
      setBirthMonth(String(Number(m)) || "")
      setBirthDay(String(Number(d)) || "")
    }
  }, [])

  useEffect(() => {
    if (!atptCode || schoolQuery.length < 2) { setSchoolResults([]); return }
    const t = setTimeout(async () => {
      const results = await searchSchools(atptCode, schoolQuery)
      setSchoolResults(results)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [schoolQuery, atptCode])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const birthday =
      birthYear && birthMonth && birthDay
        ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
        : null
    const { error } = await updateProfile({
      name,
      school_name: schoolName,
      atpt_code: atptCode,
      school_code: schoolCode,
      birthday,
    })
    setSaving(false)
    showMsg(error ? error.message : "프로필이 저장되었습니다.", error ? "error" : "success")
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">프로필 수정</h2>
      <div className="max-w-md flex flex-col gap-5">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">이름</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">소속 교육청</label>
          <select
            className={`${inputClass} appearance-none bg-white`}
            value={atptCode}
            onChange={(e) => {
              setAtptCode(e.target.value)
              setSchoolCode("")
              setSchoolName("")
              setSchoolQuery("")
            }}
          >
            <option value="">선택</option>
            {EDUCATION_OFFICES.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="relative" ref={dropdownRef}>
          <label className="text-xs text-gray-500 mb-1 block">
            학교 {schoolName && <span className="text-primary font-medium">✓ {schoolName}</span>}
          </label>
          <input
            className={inputClass}
            placeholder="학교 이름 검색"
            disabled={!atptCode}
            value={schoolQuery}
            onChange={(e) => {
              setSchoolQuery(e.target.value)
              setSchoolCode("")
              setSchoolName("")
            }}
            onFocus={() => schoolResults.length > 0 && setShowDropdown(true)}
          />
          {showDropdown && schoolResults.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg">
              {schoolResults.map((s) => (
                <li
                  key={s.schoolCode}
                  className="cursor-pointer px-4 py-3 hover:bg-gray-50"
                  onClick={() => {
                    setSchoolCode(s.schoolCode)
                    setSchoolName(s.schoolName)
                    setSchoolQuery(s.schoolName)
                    setShowDropdown(false)
                  }}
                >
                  <p className="text-sm font-medium">{s.schoolName}</p>
                  {s.address && <p className="text-xs text-gray-400">{s.address}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">생일</label>
          <div className="flex gap-2">
            <select className={`${inputClass} flex-1 appearance-none bg-white`} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
              <option value="">년</option>
              {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={String(y)}>{y}년</option>
              ))}
            </select>
            <select className={`${inputClass} flex-1 appearance-none bg-white`} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>{m}월</option>
              ))}
            </select>
            <select className={`${inputClass} flex-1 appearance-none bg-white`} value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>
              <option value="">일</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>{d}일</option>
              ))}
            </select>
          </div>
        </div>

        <button className={btnPrimary} disabled={saving} onClick={handleSave}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  )
}

/* ───────── 섹션 2: 비밀번호 변경 ───────── */
function PasswordSection({ showMsg }) {
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (newPw.length < 6) { showMsg("비밀번호는 6자 이상이어야 합니다.", "error"); return }
    if (newPw !== confirmPw) { showMsg("비밀번호가 일치하지 않습니다.", "error"); return }
    setSaving(true)
    const { error } = await updatePassword(newPw)
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return }
    showMsg("비밀번호가 변경되었습니다.")
    setNewPw("")
    setConfirmPw("")
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">비밀번호 변경</h2>
      <div className="max-w-md flex flex-col gap-5">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">새 비밀번호</label>
          <input className={inputClass} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">새 비밀번호 확인</label>
          <input className={inputClass} type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
        <button className={btnPrimary} disabled={saving} onClick={handleSave}>
          {saving ? "변경 중..." : "변경"}
        </button>
      </div>
    </div>
  )
}

/* ───────── 섹션 3: 교시 시간 설정 ───────── */
function PeriodSection({ user, showMsg }) {
  const [schedule, setSchedule] = useState(() =>
    DEFAULT_PERIOD_SCHEDULE.slice(1).map((p) => ({ ...p }))
  )
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.period_schedule) {
        const saved = data.period_schedule
        if (Array.isArray(saved) && saved.length > 0) {
          const merged = DEFAULT_PERIOD_SCHEDULE.slice(1).map((def, i) => ({
            label: def.label,
            start: saved[i]?.start || def.start,
            end: saved[i]?.end || def.end,
            enabled: saved[i]?.enabled ?? def.enabled,
          }))
          setSchedule(merged)
        }
      }
      setLoaded(true)
    })()
  }, [user.id])

  const updateField = (index, field, value) => {
    setSchedule((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertProfileRow(user.id, { period_schedule: schedule })
    setSaving(false)
    showMsg(error ? error.message : "교시 시간이 저장되었습니다.", error ? "error" : "success")
  }

  const handleReset = () => {
    setSchedule(DEFAULT_PERIOD_SCHEDULE.slice(1).map((p) => ({ ...p })))
  }

  if (!loaded) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">교시 시간 설정</h2>
      <div className="max-w-xl">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-2 items-center text-sm">
          <span />
          <span className="font-semibold text-gray-500">교시</span>
          <span className="font-semibold text-gray-500 text-center">시작</span>
          <span className="font-semibold text-gray-500 text-center">종료</span>
          {schedule.map((p, i) => (
            <div key={i} className="contents">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => updateField(i, "enabled", e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className={`font-medium ${!p.enabled ? "text-gray-300" : ""}`}>{p.label}</span>
              <input
                type="time"
                className={`h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary ${!p.enabled ? "opacity-40" : ""}`}
                value={p.start}
                disabled={!p.enabled}
                onChange={(e) => updateField(i, "start", e.target.value)}
              />
              <input
                type="time"
                className={`h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary ${!p.enabled ? "opacity-40" : ""}`}
                value={p.end}
                disabled={!p.enabled}
                onChange={(e) => updateField(i, "end", e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button className={btnPrimary} disabled={saving} onClick={handleSave}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            onClick={handleReset}
          >
            기본값으로 초기화
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────── 섹션 D-Day: D-Day 관리 ───────── */
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

const DDAY_EMOJI_OPTIONS = [
  "📅", "🎯", "🏫", "✈️", "🎉", "🎓", "📝", "💼",
  "🏖️", "🎄", "❤️", "⭐", "🔥", "🌸", "📚", "🎵",
]

function DDaySection({ user, showMsg }) {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({ title: "", date: "", emoji: "📅" })
  const [editId, setEditId] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.dday_events && Array.isArray(data.dday_events)) {
        setEvents(data.dday_events)
      }
      setLoaded(true)
    })()
  }, [user.id])

  const persist = async (next) => {
    setSaving(true)
    const { error } = await upsertProfileRow(user.id, { dday_events: next })
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return false }
    setEvents(next)
    window.dispatchEvent(new CustomEvent("dday-change", { detail: next }))
    return true
  }

  const sorted = [...events].sort((a, b) => {
    const da = Math.abs(getDDay(a.date))
    const db = Math.abs(getDDay(b.date))
    return da - db
  })

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return
    let next
    if (editId !== null) {
      next = events.map(ev => ev.id === editId ? { ...ev, ...form } : ev)
    } else {
      next = [...events, { ...form, id: Date.now() }]
    }
    const ok = await persist(next)
    if (!ok) return
    if (editId !== null) setEditId(null)
    setForm({ title: "", date: "", emoji: "📅" })
    showMsg(editId !== null ? "D-Day가 수정되었습니다." : "D-Day가 추가되었습니다.")
  }

  const handleEdit = (ev) => {
    setForm({ title: ev.title, date: ev.date, emoji: ev.emoji || "📅" })
    setEditId(ev.id)
  }

  const handleDelete = async (id) => {
    const next = events.filter(ev => ev.id !== id)
    const ok = await persist(next)
    if (!ok) return
    if (editId === id) {
      setEditId(null)
      setForm({ title: "", date: "", emoji: "📅" })
    }
    showMsg("D-Day가 삭제되었습니다.")
  }

  const handleCancel = () => {
    setEditId(null)
    setForm({ title: "", date: "", emoji: "📅" })
  }

  if (!loaded) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">D-Day 관리</h2>
      <p className="text-sm text-gray-400 mb-6">등록한 D-Day 중 가장 가까운 일정이 대시보드 '지금 이 시각' 위젯에 표시됩니다.</p>

      <div className="max-w-md flex flex-col gap-5">
        <div className="flex flex-col gap-3 p-5 rounded-xl bg-gray-50">
          <p className="text-sm font-semibold">{editId !== null ? "일정 수정" : "새 일정 추가"}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">아이콘</label>
            <div className="flex flex-wrap gap-1.5">
              {DDAY_EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                    form.emoji === e
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">일정 이름</label>
            <input
              className={inputClass}
              placeholder="예: 방학까지"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">날짜</label>
            <DateDropdown
              value={form.date}
              onChange={(v) => setForm(f => ({ ...f, date: v }))}
            />
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={handleSave}>
              {editId !== null ? "수정" : "추가"}
            </button>
            {editId !== null && (
              <button
                className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                onClick={handleCancel}
              >
                취소
              </button>
            )}
          </div>
        </div>

        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">아직 등록한 D-Day가 없습니다.</p>
        )}

        <div className="flex flex-col gap-2">
          {sorted.map((ev) => {
            const diff = getDDay(ev.date)
            const isToday = diff === 0
            const isPast = diff < 0
            return (
              <div
                key={ev.id}
                className={`flex items-center justify-between rounded-xl px-5 py-4 transition-colors cursor-pointer group ${
                  isToday
                    ? "bg-primary text-white"
                    : isPast
                      ? "bg-gray-100 text-gray-400"
                      : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => handleEdit(ev)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{ev.emoji || "📅"}</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-sm font-medium truncate ${isToday ? "text-white" : ""}`}>
                    {ev.title}
                  </span>
                  <span className={`text-xs ${isToday ? "text-white/70" : "text-gray-400"}`}>
                    {ev.date}
                  </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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
    </div>
  )
}

/* ───────── 섹션 4: 퀵링크 편집 ───────── */
function QuickLinksSection({ user, showMsg }) {
  const [links, setLinks] = useState(() => DEFAULT_QUICK_LINKS.map((l) => ({ ...l })))
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.quick_links && Array.isArray(data.quick_links) && data.quick_links.length > 0) {
        setLinks(data.quick_links)
      }
      setLoaded(true)
    })()
  }, [user.id])

  const updateLink = (index, field, value) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  const addLink = () => {
    if (links.length >= 3) return
    setLinks((prev) => [...prev, { name: "", url: "" }])
  }

  const removeLink = (index) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const valid = links.filter((l) => l.name && l.url)
    setSaving(true)
    const { error } = await upsertProfileRow(user.id, { quick_links: valid })
    setSaving(false)
    showMsg(error ? error.message : "퀵링크가 저장되었습니다.", error ? "error" : "success")
  }

  if (!loaded) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">퀵링크 편집</h2>
      <p className="text-sm text-gray-400 mb-6">프로필 하단에 표시되는 바로가기 링크입니다. 최대 3개 (+ 설정 고정)</p>
      <div className="max-w-lg flex flex-col gap-3">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inputClass} !w-28`}
              placeholder="이름"
              value={link.name}
              onChange={(e) => updateLink(i, "name", e.target.value)}
            />
            <input
              className={`${inputClass} flex-1`}
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateLink(i, "url", e.target.value)}
            />
            <button
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors px-2"
              onClick={() => removeLink(i)}
            >
              ✕
            </button>
          </div>
        ))}
        {links.length < 3 && (
          <button
            className="text-sm text-primary font-medium hover:underline self-start"
            onClick={addLink}
          >
            + 링크 추가
          </button>
        )}
        <button className={`${btnPrimary} self-start mt-2`} disabled={saving} onClick={handleSave}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  )
}

/* ───────── 섹션 5: 배경 설정 ───────── */
function BackgroundSection({ user, showMsg }) {
  const [bgType, setBgType] = useState("default")
  const [bgColor, setBgColor] = useState("#F5F5F5")
  const [bgImage, setBgImage] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.bg_prefs) {
        setBgType(data.bg_prefs.type || "default")
        setBgColor(data.bg_prefs.color || "#F5F5F5")
        setBgImage(data.bg_prefs.image || "")
      }
      setLoaded(true)
    })()
  }, [user.id])

  const applyAndSave = async (type, color, image) => {
    setSaving(true)
    const prefs = { type, color, image }
    const { error } = await upsertProfileRow(user.id, { bg_prefs: prefs })
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return }
    setBgType(type)
    setBgColor(color)
    setBgImage(image)
    window.dispatchEvent(new CustomEvent("bg-change", { detail: prefs }))
    showMsg("배경이 변경되었습니다.")
  }

  if (!loaded) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">배경 설정</h2>
      <div className="max-w-lg flex flex-col gap-6">
        <div>
          <div className="flex gap-3 mb-4">
            {["default", "color", "image"].map((t) => (
              <button
                key={t}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  bgType === t ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setBgType(t)}
              >
                {t === "default" ? "기본" : t === "color" ? "단색" : "이미지"}
              </button>
            ))}
          </div>

          {bgType === "default" && (
            <button
              className={btnPrimary}
              onClick={() => applyAndSave("default", "", "")}
            >
              기본 배경 적용
            </button>
          )}

          {bgType === "color" && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {BG_PRESETS.map((c) => (
                  <button
                    key={c}
                    className="w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: bgColor === c ? "#4A4A4A" : "transparent",
                    }}
                    onClick={() => setBgColor(c)}
                  />
                ))}
                <label className="w-10 h-10 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer relative">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="block w-full h-full" style={{ backgroundColor: bgColor }} />
                </label>
              </div>
              <button className={btnPrimary} onClick={() => applyAndSave("color", bgColor, "")}>
                적용
              </button>
            </div>
          )}

          {bgType === "image" && (
            <div className="flex flex-col gap-3">
              <input
                className={inputClass}
                placeholder="이미지 URL (https://...)"
                value={bgImage}
                onChange={(e) => setBgImage(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-primary font-medium cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      showMsg("이미지는 5MB 이하만 가능합니다.", "error")
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => setBgImage(reader.result)
                    reader.readAsDataURL(file)
                  }}
                />
                또는 파일 업로드
              </label>
              {bgImage && (
                <div
                  className="h-32 rounded-lg bg-cover bg-center border"
                  style={{ backgroundImage: `url(${bgImage})` }}
                />
              )}
              <button className={btnPrimary} onClick={() => applyAndSave("image", "", bgImage)}>
                적용
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────── 섹션 6: 위젯 꾸미기 ───────── */
const DEFAULT_WIDGET_STYLE = {
  bgColor: "#ffffff",
  bgOpacity: 100,
  backdropBlur: 0,
  borderWidth: 0,
  borderColor: "#e0e0e0",
  borderStyle: "solid",
  borderRadius: 16,
  shadow: "none",
  btnBg: "#F9F9F9",
  btnText: "#2b2b2b",
  todoBg: "#F9F9F9",
  todoText: "#2b2b2b",
  ttHeaderBg: "#FBFBFB",
  ttTodayBg: "#3B3B3B",
  ttEmptyBg: "#EBEBEB",
}

const SHADOW_PRESETS = [
  { id: "none", label: "없음", value: "none" },
  { id: "sm", label: "작게", value: "0 1px 2px 0 rgba(0,0,0,0.05)" },
  { id: "md", label: "보통", value: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)" },
  { id: "lg", label: "크게", value: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)" },
  { id: "xl", label: "아주 크게", value: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" },
]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function WidgetStyleSection({ user, showMsg }) {
  const [style, setStyle] = useState({ ...DEFAULT_WIDGET_STYLE })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.widget_style) {
        setStyle({ ...DEFAULT_WIDGET_STYLE, ...data.widget_style })
      }
      setLoaded(true)
    })()
  }, [user.id])

  const update = (key, value) => {
    setStyle(prev => {
      const next = { ...prev, [key]: value }
      if (key === "backdropBlur" && value > 0 && prev.bgOpacity > 80) {
        next.bgOpacity = 65
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertProfileRow(user.id, { widget_style: style })
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return }
    window.dispatchEvent(new CustomEvent("widget-style-change", { detail: style }))
    showMsg("위젯 스타일이 저장되었습니다.")
  }

  const handleReset = async () => {
    setSaving(true)
    const { error } = await upsertProfileRow(user.id, { widget_style: null })
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return }
    setStyle({ ...DEFAULT_WIDGET_STYLE })
    window.dispatchEvent(new CustomEvent("widget-style-change", { detail: null }))
    showMsg("기본 스타일로 초기화되었습니다.")
  }

  if (!loaded) return <p className="text-sm text-gray-400">불러오는 중...</p>

  const previewBg = `rgba(${hexToRgb(style.bgColor)}, ${style.bgOpacity / 100})`
  const previewBorder = style.borderWidth > 0
    ? `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}` : "none"
  const previewShadow = SHADOW_PRESETS.find(s => s.id === style.shadow)?.value || "none"
  const previewStyle = {
    backgroundColor: previewBg,
    border: previewBorder,
    borderRadius: `${style.borderRadius}px`,
    boxShadow: previewShadow,
    backdropFilter: style.backdropBlur > 0 ? `blur(${style.backdropBlur}px)` : "none",
    WebkitBackdropFilter: style.backdropBlur > 0 ? `blur(${style.backdropBlur}px)` : "none",
    padding: "1.75rem",
  }

  const checkerBg = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='20' height='20' fill='%23ddd'/%3E%3Crect width='10' height='10' fill='%23ccc'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23ccc'/%3E%3C/svg%3E")`,
    backgroundSize: "20px 20px",
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">위젯 꾸미기</h2>
      <p className="text-sm text-gray-500 mb-8">위젯의 배경, 테두리, 그림자 등을 자유롭게 꾸밀 수 있습니다.</p>

      <div className="flex gap-10">
        {/* Controls */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Background */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">배경</legend>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">색상</label>
                <input type="color" value={style.bgColor} onChange={e => update("bgColor", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-400 font-mono">{style.bgColor}</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">불투명도</label>
                <input type="range" min={0} max={100} value={style.bgOpacity}
                  onChange={e => update("bgOpacity", Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-xs text-gray-500 w-10 text-right">{style.bgOpacity}%</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">블러</label>
                <input type="range" min={0} max={30} value={style.backdropBlur}
                  onChange={e => update("backdropBlur", Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-xs text-gray-500 w-10 text-right">{style.backdropBlur}px</span>
              </div>
              {style.backdropBlur > 0 && style.bgOpacity > 80 && (
                <p className="text-xs text-amber-500 ml-24">
                  ⚠ 불투명도가 높으면 블러가 보이지 않아요. 불투명도를 낮춰주세요.
                </p>
              )}
            </div>
          </fieldset>

          {/* Border */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">테두리</legend>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">두께</label>
                <input type="range" min={0} max={5} value={style.borderWidth}
                  onChange={e => update("borderWidth", Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-xs text-gray-500 w-10 text-right">{style.borderWidth}px</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">색상</label>
                <input type="color" value={style.borderColor} onChange={e => update("borderColor", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-400 font-mono">{style.borderColor}</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-20 shrink-0">스타일</label>
                <div className="flex gap-2">
                  {[
                    { v: "solid", l: "실선" },
                    { v: "dashed", l: "점선" },
                    { v: "dotted", l: "동그란 점선" },
                  ].map(({ v, l }) => (
                    <button key={v} onClick={() => update("borderStyle", v)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        style.borderStyle === v
                          ? "bg-primary text-white border-primary"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Border Radius */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">모서리 둥글기</legend>
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={32} value={style.borderRadius}
                onChange={e => update("borderRadius", Number(e.target.value))}
                className="flex-1 accent-primary" />
              <span className="text-xs text-gray-500 w-10 text-right">{style.borderRadius}px</span>
            </div>
          </fieldset>

          {/* Shadow */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">그림자</legend>
            <div className="flex gap-2 flex-wrap">
              {SHADOW_PRESETS.map(sp => (
                <button key={sp.id} onClick={() => update("shadow", sp.id)}
                  className={`px-4 py-2 rounded-lg text-xs border transition ${
                    style.shadow === sp.id
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>{sp.label}</button>
              ))}
            </div>
          </fieldset>

          {/* Detail Colors */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">세부 색상</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <input type="color" value={style.btnBg} onChange={e => update("btnBg", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">퀵링크 바</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.btnText} onChange={e => update("btnText", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">퀵링크 글자</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.todoBg} onChange={e => update("todoBg", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">할일 입력창</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.todoText} onChange={e => update("todoText", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">할일 글자</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.ttHeaderBg} onChange={e => update("ttHeaderBg", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">시간표 헤더</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.ttTodayBg} onChange={e => update("ttTodayBg", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">시간표 오늘</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={style.ttEmptyBg} onChange={e => update("ttEmptyBg", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                <label className="text-sm text-gray-600">시간표 빈칸</label>
              </div>
            </div>
          </fieldset>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button className={btnPrimary} disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
              disabled={saving}
              onClick={handleReset}
            >
              초기화
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="w-72 shrink-0 sticky top-10 self-start">
          <p className="text-sm font-semibold mb-3">미리보기</p>
          {/* Widget preview */}
          <div className="rounded-xl overflow-hidden relative" style={checkerBg}>
            <div className="p-5" style={previewStyle}>
              <p className="text-sm font-semibold mb-1">위젯 미리보기</p>
              <p className="text-xs text-gray-500 mb-3">배경, 테두리, 그림자가<br />이렇게 적용됩니다.</p>
              <div className="flex gap-2">
                <span className="inline-block w-8 h-8 rounded-full bg-blue-200" />
                <span className="inline-block w-8 h-8 rounded-full bg-green-200" />
                <span className="inline-block w-8 h-8 rounded-full bg-orange-200" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 mb-5">
            체크무늬 배경은 투명도 확인용입니다.
          </p>

          {/* Timetable + QuickLink preview */}
          <p className="text-sm font-semibold mb-3">시간표 / 퀵링크 미리보기</p>
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="grid grid-cols-4 gap-0.5 p-2" style={{ backgroundColor: previewBg }}>
              <div className="rounded-md text-center text-[10px] py-1.5 font-semibold" style={{ backgroundColor: style.ttHeaderBg }} />
              <div className="rounded-md text-center text-[10px] py-1.5 font-semibold" style={{ backgroundColor: style.ttHeaderBg }}>월</div>
              <div className="rounded-md text-center text-[10px] py-1.5 font-semibold text-white" style={{ backgroundColor: style.ttTodayBg }}>화</div>
              <div className="rounded-md text-center text-[10px] py-1.5 font-semibold" style={{ backgroundColor: style.ttHeaderBg }}>수</div>
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: style.ttHeaderBg }}>1교시</div>
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: style.ttEmptyBg }} />
              <div className="rounded-md text-center text-[10px] py-1.5 relative overflow-hidden" style={{ backgroundColor: style.ttEmptyBg }}>
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: style.ttEmptyBg }} />
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: style.ttHeaderBg }}>2교시</div>
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: "#FFCDD2" }}>국어</div>
              <div className="rounded-md text-center text-[10px] py-1.5 relative overflow-hidden" style={{ backgroundColor: "#BBDEFB" }}>
                수학
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="rounded-md text-center text-[10px] py-1.5" style={{ backgroundColor: "#C8E6C9" }}>영어</div>
            </div>
            <div className="text-center text-[10px] py-2 flex justify-around" style={{ backgroundColor: style.btnBg, color: style.btnText }}>
              <span>나이스</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>에듀파인</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>설정</span>
            </div>
          </div>

          {/* ToDo preview */}
          <p className="text-sm font-semibold mb-3 mt-5">할 일 미리보기</p>
          <div className="rounded-xl overflow-hidden border border-gray-100 p-3" style={previewStyle}>
            <div className="flex gap-1.5 mb-2">
              <div className="flex-1 rounded-lg px-2 py-1.5 text-[10px]"
                style={{ backgroundColor: style.todoBg, color: style.todoText }}>
                해야 할 일을 입력하세요.
              </div>
              <div className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold"
                style={{ backgroundColor: style.todoBg, color: style.todoText }}>
                추가
              </div>
            </div>
            <div className="flex items-center gap-1.5 py-1 border-b border-gray-100">
              <span className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              <span className="text-[10px] flex-1">과제 제출하기</span>
            </div>
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: "#2b2b2b", backgroundColor: "#2b2b2b" }}>
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="text-[10px] flex-1 line-through text-gray-400">회의 준비</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────── 섹션: 학사일정 관리 ───────── */
function SchoolEventsSection({ user, showMsg }) {
  const meta = user.user_metadata || {}
  const atptCode = meta.atpt_code
  const schoolCode = meta.school_code
  const schoolName = meta.school_name

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" })

  useEffect(() => {
    if (!atptCode || !schoolCode) { setLoading(false); return }
    (async () => {
      const { data } = await fetchSchoolEvents(atptCode, schoolCode)
      setEvents(data)
      setLoading(false)
    })()
  }, [atptCode, schoolCode])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.startDate) return
    const startStr = form.startDate.replace(/-/g, "")
    const endStr = form.endDate ? form.endDate.replace(/-/g, "") : null
    setSaving(true)
    const { data, error } = await addSchoolEvent({
      atptCode,
      schoolCode,
      date: startStr,
      endDate: endStr,
      name: form.name.trim(),
      userId: user.id,
    })
    setSaving(false)
    if (error) { showMsg(error.message, "error"); return }
    setEvents(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    setForm({ name: "", startDate: "", endDate: "" })
    window.dispatchEvent(new Event("school-events-change"))
    showMsg("학사일정이 추가되었습니다.")
  }

  const handleDelete = async (id) => {
    const { error } = await deleteSchoolEvent(id)
    if (error) { showMsg(error.message, "error"); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    window.dispatchEvent(new Event("school-events-change"))
    showMsg("일정이 삭제되었습니다.")
  }

  if (!atptCode || !schoolCode) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">학사일정 관리</h2>
        <p className="text-sm text-gray-400">프로필에서 학교 정보를 먼저 설정해주세요.</p>
      </div>
    )
  }

  const formatDate = (d) => `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`
  const formatRange = (ev) => {
    const s = formatDate(ev.date)
    if (!ev.end_date || ev.end_date === ev.date) return s
    return `${s} ~ ${formatDate(ev.end_date)}`
  }

  const PAGE_SIZE = 4
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const pagedEvents = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">학사일정 관리</h2>
      <p className="text-sm text-gray-400 mb-6">
        {schoolName || "내 학교"}의 학사일정을 추가하면, 같은 학교 선생님 모두에게 표시됩니다.
      </p>

      <div className="max-w-lg flex flex-col gap-5">
        <div className="flex flex-col gap-3 p-5 rounded-xl bg-gray-50">
          <p className="text-sm font-semibold">새 일정 추가</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">일정 이름</label>
            <input
              className={inputClass}
              placeholder="예: 1학기 중간고사"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">시작일</label>
            <DateDropdown
              value={form.startDate}
              onChange={(v) => setForm(f => ({ ...f, startDate: v }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">종료일 (하루짜리면 비워두세요)</label>
            <DateDropdown
              value={form.endDate}
              onChange={(v) => setForm(f => ({ ...f, endDate: v }))}
            />
          </div>
          <button className={btnPrimary} disabled={saving} onClick={handleAdd}>
            {saving ? "추가 중..." : "추가"}
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}

        {!loading && events.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            아직 추가된 학사일정이 없습니다.
          </p>
        )}

        {!loading && events.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {pagedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{ev.name}</span>
                    <span className="text-xs text-gray-400">{formatRange(ev)}</span>
                  </div>
                  {ev.created_by === user.id && (
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-all shrink-0 ml-2"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-sm hover:opacity-60 transition-opacity disabled:opacity-30"
                >
                  ◀
                </button>
                <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-sm hover:opacity-60 transition-opacity disabled:opacity-30"
                >
                  ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ───────── 섹션 7: 회원 탈퇴 ───────── */
function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deleteOwnAccount()
    if (error) {
      setDeleting(false)
      alert("탈퇴 처리 중 오류가 발생했습니다: " + error.message)
      return
    }
    await signOut()
    window.location.href = "/"
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2 text-red-600">회원 탈퇴</h2>
      <p className="text-sm text-gray-500 mb-6">
        탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다.<br />
        탈퇴를 원하시면 아래에 <strong className="text-red-600">"탈퇴합니다"</strong>를 입력해주세요.
      </p>
      <div className="max-w-md flex flex-col gap-4">
        <input
          className={inputClass}
          placeholder='탈퇴합니다'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <button
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 self-start"
          disabled={confirmText !== "탈퇴합니다" || deleting}
          onClick={handleDelete}
        >
          {deleting ? "처리 중..." : "회원 탈퇴"}
        </button>
      </div>
    </div>
  )
}
