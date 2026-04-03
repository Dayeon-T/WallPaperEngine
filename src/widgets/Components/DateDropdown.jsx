import { useState, useEffect, useRef } from "react"

export default function DateDropdown({ value, onChange, size = "default", defaultYear }) {
  const h = size === "small" ? "h-9" : "h-12"
  const base = `${h} rounded-lg border border-gray-200 text-sm text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary`
  const mRef = useRef(null)
  const dRef = useRef(null)
  const fallbackYear = String(defaultYear || new Date().getFullYear())

  const [y, setY] = useState("")
  const [m, setM] = useState("")
  const [d, setD] = useState("")

  useEffect(() => {
    if (!value) { setY(""); setM(""); setD(""); return }
    const parts = value.split("-")
    setY(parts[0] || "")
    setM(parts[1] ? String(Number(parts[1])) : "")
    setD(parts[2] ? String(Number(parts[2])) : "")
  }, [value])

  const tryEmit = (ny, nm, nd) => {
    const yr = (ny && ny.length === 4) ? ny : (!ny && nm && nd) ? fallbackYear : ny
    if (yr && yr.length === 4 && nm && nd) {
      if (!ny) setY(yr)
      onChange(`${yr}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`)
    } else if (!ny && !nm && !nd) {
      onChange("")
    }
  }

  const handleYear = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4)
    setY(v)
    tryEmit(v, m, d)
    if (v.length === 4) mRef.current?.focus()
  }

  const handleMonth = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2)
    if (v && Number(v) > 12) return
    setM(v)
    tryEmit(y, v, d)
    if (v.length === 2 || (v.length === 1 && Number(v) > 1)) dRef.current?.focus()
  }

  const handleDay = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2)
    if (v && Number(v) > 31) return
    setD(v)
    tryEmit(y, m, v)
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        className={`${base} w-[4.5rem] px-1`}
        placeholder="2026"
        value={y}
        onChange={handleYear}
      />
      <span className="text-gray-400 text-sm">/</span>
      <input
        type="text"
        ref={mRef}
        className={`${base} w-[3rem] px-1`}
        placeholder="MM"
        value={m}
        onChange={handleMonth}
      />
      <span className="text-gray-400 text-sm">/</span>
      <input
        type="text"
        ref={dRef}
        className={`${base} w-[3rem] px-1`}
        placeholder="DD"
        value={d}
        onChange={handleDay}
      />
    </div>
  )
}
