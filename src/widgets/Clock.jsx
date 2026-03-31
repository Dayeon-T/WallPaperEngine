import { useState, useEffect } from "react"

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours()
  const period = hours < 12 ? "오전" : "오후"
  const h = String(hours % 12 || 12).padStart(2, "0")
  const m = String(time.getMinutes()).padStart(2, "0")
  const s = String(time.getSeconds()).padStart(2, "0")

  return (
    <div>
      <p className="text-m font-semibold">현재 시각</p>
      <p className="text-5xl font-extrabold font-ubuntu">{h} : {m} : {s}</p>
    </div>
  )
}
