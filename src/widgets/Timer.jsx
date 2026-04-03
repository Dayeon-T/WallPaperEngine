import { useState, useEffect, useRef } from "react"

export default function Timer() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

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

  const addFive = () => setSeconds((prev) => prev + 300)
  const reset = () => { setRunning(false); setSeconds(0) }
  const toggle = () => {
    if (!running && seconds === 0) return
    setRunning((prev) => !prev)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <div className="flex h-full flex-col items-end justify-start rounded-2xl  p-4">
      <p className="text-[clamp(1.2rem,2.2vw,2.25rem)] font-extrabold font-ubuntu">{mm} : {ss}</p>
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
