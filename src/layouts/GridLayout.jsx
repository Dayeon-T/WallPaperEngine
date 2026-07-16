import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchProfileRow, upsertProfileRow } from "../api/settings"
import { joinPresence } from "../api/cheers"
import {
  GRID_COLS, GRID_ROWS,
  DEFAULT_LAYOUTS, mergeLayouts, minSize, sizeLock, WIDGET_NAMES,
} from "./gridDefaults"
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

const LOCAL_LAYOUT_KEY = "widget_layout"
const MODE_CACHE_KEY = "layout_mode_cache"
// 설정 페이지에서 "편집 모드 열기"를 누르면 이 플래그를 세팅하고 대시보드로 이동
const LAYOUT_EDIT_FLAG = "layout_edit_pending"

// 첫 렌더링부터 마지막 배치가 바로 보이도록 localStorage 캐시를 동기적으로 읽는다.
// (서버 조회를 기다리면 기본 배치가 먼저 그려졌다가 바뀌는 깜빡임이 생김)
function readCachedLayouts() {
  try {
    return mergeLayouts(JSON.parse(localStorage.getItem(LOCAL_LAYOUT_KEY)))
  } catch {
    return mergeLayouts(null)
  }
}

function readCachedMode() {
  const m = localStorage.getItem(MODE_CACHE_KEY)
  return m === "vertical" || m === "horizontal" ? m : "horizontal"
}

function writeLayoutCache(layouts, mode) {
  try {
    localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(layouts))
    localStorage.setItem(MODE_CACHE_KEY, mode)
  } catch { /* 무시 */ }
}

// 8방향 리사이즈 핸들 (상하좌우 가장자리 + 네 모서리)
const RESIZE_HANDLES = [
  { dir: "n", cls: "top-[-3px] left-4 right-4 h-2 cursor-ns-resize" },
  { dir: "s", cls: "bottom-[-3px] left-4 right-4 h-2 cursor-ns-resize" },
  { dir: "w", cls: "left-[-3px] top-4 bottom-4 w-2 cursor-ew-resize" },
  { dir: "e", cls: "right-[-3px] top-4 bottom-4 w-2 cursor-ew-resize" },
  { dir: "nw", cls: "top-[-5px] left-[-5px] w-3 h-3 cursor-nwse-resize rounded-full bg-white border-2 border-blue-400" },
  { dir: "ne", cls: "top-[-5px] right-[-5px] w-3 h-3 cursor-nesw-resize rounded-full bg-white border-2 border-blue-400" },
  { dir: "sw", cls: "bottom-[-5px] left-[-5px] w-3 h-3 cursor-nesw-resize rounded-full bg-white border-2 border-blue-400" },
  { dir: "se", cls: "bottom-[-5px] right-[-5px] w-3 h-3 cursor-nwse-resize rounded-full bg-white border-2 border-blue-400" },
]

function ProfileSlot() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Profile /> : <Login />
}

// 위젯 레지스트리: 레이아웃 데이터의 id ↔ 컴포넌트 매핑
const WIDGETS = {
  profile: ProfileSlot,
  folders: Folders,
  clock: Clock,
  cheer: CheerButton,
  weather: Weather,
  timetable: Timetable,
  nowtime: NowTime,
  todo: ToDo,
  meals: SchoolMeals,
  schedule: Schedule,
}

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

function rectsCollide(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function isValidPlacement(layout, id, rect) {
  if (rect.x < 0 || rect.y < 0) return false
  if (rect.x + rect.w > GRID_COLS || rect.y + rect.h > GRID_ROWS) return false
  return Object.entries(layout).every(([otherId, other]) =>
    otherId === id || other.hidden || !rectsCollide(rect, other)
  )
}

// 리사이즈 잠금에 걸리지 않는 핸들만 표시
function allowedHandles(id) {
  const lock = sizeLock(id)
  return RESIZE_HANDLES.filter((h) =>
    !(lock.w && (h.dir.includes("e") || h.dir.includes("w"))) &&
    !(lock.h && (h.dir.includes("n") || h.dir.includes("s")))
  )
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// 단일 위젯(singleId)과 열 밴드 묶음(bandId가 속한 열에서 단일 위젯의
// 세로 범위와 겹치는 위젯들)을 통째로 맞바꾸는 후보 생성.
// 예: 시간표(높이 12) ↔ [지금 이 시각(3) + 할 일(9)] 묶음
function bandSwapCandidate(layout, singleId, bandId) {
  const single = layout[singleId]
  const base = layout[bandId]

  // 같은 열(x, w 동일) + 단일 위젯의 y범위와 겹치는 것만 묶음으로 인정
  const members = Object.entries(layout).filter(([, r]) =>
    !r.hidden && r.x === base.x && r.w === base.w &&
    r.y < single.y + single.h && single.y < r.y + r.h
  )
  if (members.length < 2) return null
  if (members.some(([k]) => k === singleId)) return null

  const minY = Math.min(...members.map(([, r]) => r.y))
  const maxY = Math.max(...members.map(([, r]) => r.y + r.h))
  const box = { x: base.x, y: minY, w: base.w, h: maxY - minY }

  const next = { ...layout }
  const dx = single.x - box.x
  const dy = single.y - box.y
  for (const [k, r] of members) next[k] = { ...r, x: r.x + dx, y: r.y + dy }
  next[singleId] = { ...single, x: box.x, y: box.y }
  return next
}

export default function GridLayout() {
  const { user, loading } = useAuth()
  const [showBirthday, setShowBirthday] = useState(false)
  const [layoutMode, setLayoutMode] = useState(readCachedMode)
  const [layouts, setLayouts] = useState(readCachedLayouts)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const containerRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (loading) return
    ;(async () => {
      let saved = null
      let mode = layoutMode
      if (user) {
        const { data } = await fetchProfileRow(user.id)
        if (data?.layout_mode) mode = data.layout_mode
        saved = data?.widget_layout
      } else {
        try { saved = JSON.parse(localStorage.getItem(LOCAL_LAYOUT_KEY)) } catch { /* 무시 */ }
      }
      const merged = mergeLayouts(saved)
      setLayoutMode(mode)
      setLayouts(merged)
      // 다음 새로고침 때 서버 응답을 기다리지 않고 바로 이 배치가 뜨도록 캐시
      if (user) writeLayoutCache(merged, mode)

      // 설정 페이지에서 편집 모드로 진입한 경우
      if (sessionStorage.getItem(LAYOUT_EDIT_FLAG)) {
        sessionStorage.removeItem(LAYOUT_EDIT_FLAG)
        setDraft(structuredClone(merged[mode] || merged.horizontal))
        setEditing(true)
      }
    })()
  }, [user, loading])

  useEffect(() => {
    const handler = (e) => {
      setLayoutMode(e.detail)
      setEditing(false)
      setDraft(null)
      try { localStorage.setItem(MODE_CACHE_KEY, e.detail) } catch { /* 무시 */ }
    }
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

  const layout = (editing && draft) || layouts[layoutMode] || layouts.horizontal

  // === 편집 모드 ===

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    dragRef.current = null
  }

  const resetDraft = () => {
    setDraft(structuredClone(DEFAULT_LAYOUTS[layoutMode] || DEFAULT_LAYOUTS.horizontal))
  }

  const saveEdit = async () => {
    const next = { ...layouts, [layoutMode]: draft }
    setLayouts(next)
    setEditing(false)
    setDraft(null)
    writeLayoutCache(next, layoutMode)
    if (user) {
      await upsertProfileRow(user.id, { widget_layout: next })
    }
  }

  // === 드래그 / 리사이즈 (pointer 이벤트 — 벽지 환경 호환 필수, HTML5 DnD 금지) ===

  const startDrag = (e, id, mode) => {
    if (!containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    dragRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...draft[id] },
      left: rect.left,
      top: rect.top,
      cellW: rect.width / GRID_COLS,
      cellH: rect.height / GRID_ROWS,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setActiveId(id)
  }

  const onDragMove = (e) => {
    const d = dragRef.current
    if (!d || !draft) return
    const dx = Math.round((e.clientX - d.startX) / d.cellW)
    const dy = Math.round((e.clientY - d.startY) / d.cellH)
    const cur = draft[d.id]

    if (d.mode === "move") {
      const next = {
        ...d.orig,
        x: clamp(d.orig.x + dx, 0, GRID_COLS - d.orig.w),
        y: clamp(d.orig.y + dy, 0, GRID_ROWS - d.orig.h),
      }

      if (isValidPlacement(draft, d.id, next)) {
        if (cur.x !== next.x || cur.y !== next.y) setDraft({ ...draft, [d.id]: next })
        return
      }

      // 빈자리가 없으면 스왑 시도: 포인터가 올라가 있는 위젯과 자리를 맞바꾼다
      const px = Math.floor((e.clientX - d.left) / d.cellW)
      const py = Math.floor((e.clientY - d.top) / d.cellH)
      const target = Object.entries(draft).find(([otherId, r]) =>
        otherId !== d.id && !r.hidden &&
        px >= r.x && px < r.x + r.w &&
        py >= r.y && py < r.y + r.h
      )
      if (!target) return
      const [otherId, other] = target

      // 스왑 후보를 순서대로 시도해서 첫 번째로 유효한 배치를 적용
      const candidates = [
        // 1) 단순 위치 교환 (크기가 같으면 항상 성립)
        {
          ...draft,
          [d.id]: { ...cur, x: other.x, y: other.y },
          [otherId]: { ...other, x: cur.x, y: cur.y },
        },
      ]
      if (other.x === cur.x) {
        // 2) 같은 열에서 위아래 순서 뒤집기 (크기 달라도 시도, 유효성 검사가 거름)
        candidates.push(
          other.y > cur.y
            ? { ...draft, [otherId]: { ...other, y: cur.y }, [d.id]: { ...cur, y: cur.y + other.h } }
            : { ...draft, [d.id]: { ...cur, y: other.y }, [otherId]: { ...other, y: other.y + cur.h } }
        )
      }
      if (other.y === cur.y) {
        // 3) 같은 행에서 좌우 순서 뒤집기 (크기 달라도 시도)
        candidates.push(
          other.x > cur.x
            ? { ...draft, [otherId]: { ...other, x: cur.x }, [d.id]: { ...cur, x: cur.x + other.w } }
            : { ...draft, [d.id]: { ...cur, x: other.x }, [otherId]: { ...other, x: other.x + cur.w } }
        )
      }

      // 4) 그룹 스왑: 상대가 열 밴드의 일원이면 밴드 전체와 교환,
      //    내가 밴드의 일원이면 내 밴드 전체가 상대와 교환
      const bandA = bandSwapCandidate(draft, d.id, otherId)
      if (bandA) candidates.push(bandA)
      const bandB = bandSwapCandidate(draft, otherId, d.id)
      if (bandB) candidates.push(bandB)

      // 바뀌는 모든 위젯의 배치가 유효한 첫 후보 적용
      const swapped = candidates.find((c) => {
        const changed = Object.keys(c).filter((k) => c[k] !== draft[k])
        return changed.every((k) => isValidPlacement(c, k, c[k]))
      })
      if (swapped) {
        setDraft(swapped)
        // 스왑 후 이어지는 드래그가 새 위치 기준으로 계산되도록 재기준점 설정
        d.orig = { ...swapped[d.id] }
        d.startX = e.clientX
        d.startY = e.clientY
      }
      return
    }

    // d.mode = 리사이즈 방향("n","s","e","w","ne","nw","se","sw")
    // 동/남쪽은 크기만, 서/북쪽은 위치와 크기를 함께 조절.
    // 최소 크기는 위젯별로 다르고(내용이 깨지지 않는 한계), 잠긴 축은 무시
    const min = minSize(d.id)
    const lock = sizeLock(d.id)
    let { x, y, w, h } = d.orig
    if (!lock.w && d.mode.includes("e")) w = clamp(d.orig.w + dx, min.w, GRID_COLS - d.orig.x)
    if (!lock.h && d.mode.includes("s")) h = clamp(d.orig.h + dy, min.h, GRID_ROWS - d.orig.y)
    if (!lock.w && d.mode.includes("w")) {
      x = clamp(d.orig.x + dx, 0, d.orig.x + d.orig.w - min.w)
      w = d.orig.w + (d.orig.x - x)
    }
    if (!lock.h && d.mode.includes("n")) {
      y = clamp(d.orig.y + dy, 0, d.orig.y + d.orig.h - min.h)
      h = d.orig.h + (d.orig.y - y)
    }
    const next = { x, y, w, h }
    if (cur.x === next.x && cur.y === next.y && cur.w === next.w && cur.h === next.h) return
    if (isValidPlacement(draft, d.id, next)) setDraft({ ...draft, [d.id]: next })
  }

  const endDrag = () => {
    dragRef.current = null
    setActiveId(null)
  }

  // === 위젯 숨기기 / 복원 ===

  const hideWidget = (id) => {
    setDraft((prev) => prev && { ...prev, [id]: { ...prev[id], hidden: true } })
  }

  const restoreWidget = (id) => {
    if (!draft) return
    const r = draft[id]
    // 기본 프리셋 위치 → 현재 크기로 들어갈 첫 빈자리 순으로 시도
    const candidates = []
    const def = DEFAULT_LAYOUTS[layoutMode]?.[id]
    if (def) candidates.push({ ...def })
    for (let y = 0; y <= GRID_ROWS - r.h; y++)
      for (let x = 0; x <= GRID_COLS - r.w; x++)
        candidates.push({ x, y, w: r.w, h: r.h })
    const spot = candidates.find((rect) => isValidPlacement(draft, id, rect))
    if (spot) setDraft({ ...draft, [id]: { ...spot, hidden: false } })
  }

  return (
    <>
      <DDayBadge />
      <CheerToast />
      {showBirthday && (
        <BirthdayOverlay userName={user?.user_metadata?.name || "선생님"} />
      )}

      {/* 편집 모드 툴바 (진입은 설정 → 레이아웃 → 편집 모드 열기) */}
      {editing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 flex-wrap max-w-[90vw] bg-white/80 backdrop-blur-md shadow-md rounded-xl px-3 py-2">
          <span className="text-xs font-medium text-gray-500 pr-1">
            드래그로 이동/스왑, 가장자리로 크기 조절, ✕로 숨기기
          </span>
          {draft && Object.keys(draft).filter((id) => draft[id].hidden).map((id) => (
            <button
              key={id}
              onClick={() => restoreWidget(id)}
              title="위젯 다시 켜기"
              className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg"
            >
              + {WIDGET_NAMES[id] || id}
            </button>
          ))}
          <button
            onClick={resetDraft}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            초기화
          </button>
          <button
            onClick={cancelEdit}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            취소
          </button>
          <button
            onClick={saveEdit}
            className="text-xs font-semibold text-white bg-primary px-3 py-1 rounded-lg hover:opacity-80"
          >
            저장
          </button>
        </div>
      )}

      <div ref={containerRef} className="relative h-full">
        {/* 편집 모드 배경 그리드 점 */}
        {editing && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, #9ca3af 1px, transparent 1px)",
              backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%`,
              backgroundPosition: "-0.5px -0.5px",
            }}
          />
        )}

        {Object.keys(WIDGETS).map((id) => {
          const Widget = WIDGETS[id]
          const r = layout[id]
          if (!r || r.hidden) return null
          return (
            // 절대좌표(%) 배치: grid와 달리 left/top/width/height가
            // CSS 트랜지션으로 애니메이션되므로 이동/스왑이 부드럽게 미끄러진다.
            // 드래그 중인 위젯은 즉각 반응하도록 트랜지션 제외
            <div
              key={id}
              className={`absolute min-w-0 min-h-0 ${
                activeId === id ? "z-20" : "transition-all duration-300 ease-out"
              }`}
              style={{
                left: `${(r.x / GRID_COLS) * 100}%`,
                top: `${(r.y / GRID_ROWS) * 100}%`,
                width: `${(r.w / GRID_COLS) * 100}%`,
                height: `${(r.h / GRID_ROWS) * 100}%`,
                padding: "0.5vw", // 기존 grid gap-[1vw] 대체 (셀 사이 간격)
              }}
            >
              <div className="relative h-full min-h-0">
              {/* 위젯이 셀보다 작게 리사이즈됐을 때 내용이 밖으로 넘치지 않게 클립 */}
              <div
                className="h-full min-h-0 overflow-hidden *:h-full"
                style={{ borderRadius: "var(--widget-radius)" }}
              >
                <Widget />
              </div>
              {/* 편집 오버레이: 위젯 내부 클릭 차단 + 이동/8방향 리사이즈 핸들 */}
              {editing && (
                <div
                  className={`absolute inset-0 z-10 rounded-2xl cursor-move touch-none select-none ring-2 transition-colors ${
                    activeId === id
                      ? "ring-blue-500 bg-blue-400/20"
                      : "ring-blue-300/70 bg-blue-300/5 hover:bg-blue-300/15"
                  }`}
                  onPointerDown={(e) => startDrag(e, id, "move")}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {allowedHandles(id).map((h) => (
                    <div
                      key={h.dir}
                      className={`absolute ${h.cls}`}
                      onPointerDown={(e) => startDrag(e, id, h.dir)}
                    />
                  ))}
                  <button
                    title="위젯 숨기기"
                    className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 shadow text-gray-500 hover:text-red-500 hover:bg-white text-xs font-bold cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => hideWidget(id)}
                  >
                    ✕
                  </button>
                </div>
              )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
