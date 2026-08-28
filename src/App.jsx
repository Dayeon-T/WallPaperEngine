import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import { useAuth } from "./context/AuthContext"
import { fetchProfileRow } from "./api/settings"
import GridLayout from "./layouts/GridLayout"
import SignIn from "./pages/SignIn"
import SignUp from "./pages/SignUp"
import FindId from "./pages/FindId"
import FindPassword from "./pages/FindPassword"
import ResetPassword from "./pages/ResetPassword"
import Settings from "./pages/Settings"
import Messages from "./pages/Messages"
import Privacy from "./pages/Privacy"
import Terms from "./pages/Terms"
import ConsentGate from "./legal/ConsentGate"

// 교실 전자칠판 화면. 대시보드와 번들을 분리한다.
const Board = lazy(() => import("./pages/Board"))

function bgPrefsToStyle(prefs) {
  if (!prefs) return {}
  if (prefs.type === "color" && prefs.color) return { backgroundColor: prefs.color }
  if (prefs.type === "image" && prefs.image)
    return { backgroundImage: `url(${prefs.image})`, backgroundSize: "cover", backgroundPosition: "center" }
  return {}
}

// 동의 화면을 덮으면 안 되는 경로.
// 약관 전문은 동의 여부를 판단하려고 여는 것이므로 반드시 제외해야 합니다.
const CONSENT_EXEMPT_PATHS = [
  "/signin", "/signup", "/find-id", "/find-password", "/reset-password",
  "/privacy", "/terms",
]

const SHADOW_MAP = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function applyWidgetStyle(s) {
  const root = document.documentElement.style
  const vars = [
    "--widget-bg", "--widget-border", "--widget-radius",
    "--widget-shadow", "--widget-backdrop", "--widget-btn-bg",
    "--widget-btn-text", "--todo-bg", "--todo-text",
    "--tt-header-bg", "--tt-today-bg", "--tt-empty-bg",
    "--schedule-today-bg", "--schedule-today-text",
  ]
  if (!s) {
    vars.forEach(v => root.removeProperty(v))
    return
  }
  root.setProperty("--widget-bg", `rgba(${hexToRgb(s.bgColor)}, ${s.bgOpacity / 100})`)
  root.setProperty("--widget-border",
    s.borderWidth > 0 ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}` : "none")
  root.setProperty("--widget-radius", `${s.borderRadius}px`)
  root.setProperty("--widget-shadow", SHADOW_MAP[s.shadow] || "none")
  root.setProperty("--widget-backdrop", s.backdropBlur > 0 ? `blur(${s.backdropBlur}px)` : "none")
  if (s.btnBg) root.setProperty("--widget-btn-bg", s.btnBg)
  if (s.btnText) root.setProperty("--widget-btn-text", s.btnText)
  if (s.todoBg) root.setProperty("--todo-bg", s.todoBg)
  if (s.todoText) root.setProperty("--todo-text", s.todoText)
  if (s.ttHeaderBg) root.setProperty("--tt-header-bg", s.ttHeaderBg)
  if (s.ttTodayBg) root.setProperty("--tt-today-bg", s.ttTodayBg)
  if (s.ttEmptyBg) root.setProperty("--tt-empty-bg", s.ttEmptyBg)
  if (s.scheduleTodayBg) root.setProperty("--schedule-today-bg", s.scheduleTodayBg)
  if (s.scheduleTodayText) root.setProperty("--schedule-today-text", s.scheduleTodayText)
}

function App() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [bgStyle, setBgStyle] = useState({})

  useEffect(() => {
    if (!user) {
      setBgStyle({})
      applyWidgetStyle(null)
      return
    }
    (async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.bg_prefs) setBgStyle(bgPrefsToStyle(data.bg_prefs))
      applyWidgetStyle(data?.widget_style || null)
    })()
  }, [user])

  useEffect(() => {
    const bgHandler = (e) => setBgStyle(bgPrefsToStyle(e.detail))
    const wsHandler = (e) => applyWidgetStyle(e.detail)
    window.addEventListener("bg-change", bgHandler)
    window.addEventListener("widget-style-change", wsHandler)
    return () => {
      window.removeEventListener("bg-change", bgHandler)
      window.removeEventListener("widget-style-change", wsHandler)
    }
  }, [])

  // 칠판은 교사 대시보드의 배경·여백·동의 화면과 무관한 전체 화면이다.
  // 대시보드로 통하는 요소가 함께 렌더되지 않도록 셸 바깥에서 그린다.
  if (pathname === "/board") {
    return (
      <Suspense fallback={null}>
        <Board />
      </Suspense>
    )
  }

  const hasCustomBg = bgStyle.backgroundColor || bgStyle.backgroundImage

  return (
    <div
      className={`fixed inset-0 text-text ${hasCustomBg ? "" : "bg-bg"}`}
      style={hasCustomBg ? bgStyle : undefined}
    >
      {!CONSENT_EXEMPT_PATHS.includes(pathname) && <ConsentGate />}
      <div className="absolute left-7 right-7 top-7 bottom-16">
        <Routes>
          <Route path="/" element={<GridLayout />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
          {/* 약관·처리방침은 가입 전에도 봐야 하므로 로그인 없이 접근 가능 */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
