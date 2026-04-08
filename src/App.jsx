import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { useAuth } from "./context/AuthContext"
import { fetchProfileRow } from "./api/settings"
import GridLayout from "./layouts/GridLayout"
import SignIn from "./pages/SignIn"
import SignUp from "./pages/SignUp"
import FindId from "./pages/FindId"
import FindPassword from "./pages/FindPassword"
import Settings from "./pages/Settings"

function bgPrefsToStyle(prefs) {
  if (!prefs) return {}
  if (prefs.type === "color" && prefs.color) return { backgroundColor: prefs.color }
  if (prefs.type === "image" && prefs.image)
    return { backgroundImage: `url(${prefs.image})`, backgroundSize: "cover", backgroundPosition: "center" }
  return {}
}

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

  const hasCustomBg = bgStyle.backgroundColor || bgStyle.backgroundImage

  return (
    <div
      className={`fixed inset-0 text-text ${hasCustomBg ? "" : "bg-bg"}`}
      style={hasCustomBg ? bgStyle : undefined}
    >
      <div className="absolute left-7 right-7 top-7 bottom-16">
        <Routes>
          <Route path="/" element={<GridLayout />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
