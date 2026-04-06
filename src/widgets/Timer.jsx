import { useState, useEffect, useRef } from "react"

export default function Timer() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState("")
  const intervalRef = useRef(null)
  const editRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editing])

  const addFive = () => setSeconds((prev) => prev + 300)
  const reset = () => { setRunning(false); setSeconds(0); setEditing(null) }
  const toggle = () => {
    if (!running && seconds === 0) return
    setRunning((prev) => !prev)
  }

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60

  const startEdit = (field) => {
    if (running) return
    setEditing(field)
    setEditValue(String(field === "mm" ? mm : ss).padStart(2, "0"))
  }

  const commitEdit = () => {
    const val = Math.max(0, parseInt(editValue, 10) || 0)
    if (editing === "mm") {
      setSeconds(val * 60 + ss)
    } else {
      setSeconds(mm * 60 + Math.min(val, 59))
    }
    setEditing(null)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") commitEdit()
    if (e.key === "Escape") setEditing(null)
  }

  const digitStyle = "text-[clamp(1.2rem,2.2vw,2.25rem)] font-extrabold font-ubuntu cursor-pointer hover:opacity-70 transition-opacity"

  return (
    <div className="flex h-full flex-col items-end justify-start rounded-2xl p-4">
      <div className="flex items-baseline">
        {editing === "mm" ? (
          <input
            ref={editRef}
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            className="w-[2.5em] text-[clamp(1.2rem,2.2vw,2.25rem)] font-extrabold font-ubuntu text-right bg-transparent border-b-2 border-primary outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        ) : (
          <span className={digitStyle} onClick={() => startEdit("mm")}>
            {String(mm).padStart(2, "0")}
          </span>
        )}
        <span className="text-[clamp(1.2rem,2.2vw,2.25rem)] font-extrabold font-ubuntu mx-1"> : </span>
        {editing === "ss" ? (
          <input
            ref={editRef}
            type="number"
            min="0"
            max="59"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            className="w-[2.5em] text-[clamp(1.2rem,2.2vw,2.25rem)] font-extrabold font-ubuntu bg-transparent border-b-2 border-primary outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        ) : (
          <span className={digitStyle} onClick={() => startEdit("ss")}>
            {String(ss).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-[0.4vw]">
        <button
          onClick={addFive}
          className="flex h-[clamp(1.5rem,2.2vw,2.25rem)] w-[clamp(1.5rem,2.2vw,2.25rem)] items-center justify-center rounded-full bg-primary text-[clamp(0.5rem,0.7vw,0.75rem)] font-bold text-white transition hover:opacity-80"
        >
          +5
        </button>
        <button
          onClick={reset}
          className="flex h-[clamp(1.5rem,2.2vw,2.25rem)] w-[clamp(1.5rem,2.2vw,2.25rem)] items-center justify-center rounded-full bg-primary text-white transition hover:opacity-80"
        >
          <svg className="h-[clamp(0.7rem,1vw,1rem)] w-[clamp(0.7rem,1vw,1rem)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          onClick={toggle}
          className="flex h-[clamp(1.5rem,2.2vw,2.25rem)] w-[clamp(1.5rem,2.2vw,2.25rem)] items-center justify-center rounded-full bg-primary text-white transition hover:opacity-80"
        >
          {running ? (
            <svg className="h-[clamp(0.7rem,1vw,1rem)] w-[clamp(0.7rem,1vw,1rem)]" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-[clamp(0.7rem,1vw,1rem)] w-[clamp(0.7rem,1vw,1rem)]" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
