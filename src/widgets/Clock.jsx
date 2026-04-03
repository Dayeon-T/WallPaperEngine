import { useState, useEffect } from "react"

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const days = ["일", "월", "화", "수", "목", "금", "토"]
  const hours = time.getHours()
  const h = String(hours).padStart(2, "0")
  const m = String(time.getMinutes()).padStart(2, "0")
  const s = String(time.getSeconds()).padStart(2, "0")
  const year = time.getFullYear()
  const month = time.getMonth() + 1
  const date = String(time.getDate()).padStart(2, "0")
  const day = days[time.getDay()]

  return (
    <div className="flex rounded-2xl p-7 bg-white/0 backdrop-blur-lg">
    <div className="flex flex-col justify-end">
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold ">현재 시각</p>
      <p className="text-[clamp(2rem,4.5vw,4.5rem)] font-extrabold font-ubuntu">{h} : {m} : {s}</p>
      <p className=" ml-[0.3vw] text-[clamp(0.7rem,1vw,1.125rem)] text-[#272727]"><span className="font-ubuntu font-medium">{year}</span>년 <span className="font-ubuntu font-medium">{month}</span>월 <span className="font-ubuntu font-medium">{date}</span>일 ({day})</p>
      </div>
    </div>
  );
}
