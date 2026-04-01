import { useState, useEffect } from "react"

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

export default function Weather() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${API_KEY}`
          )
          const data = await res.json()
          setWeather({
            temp: Math.round(data.main.temp),
            min: Math.round(data.main.temp_min),
            max: Math.round(data.main.temp_max),
            city: data.name,
          })
        } catch {
          setError("날씨 정보를 불러올 수 없습니다.")
        }
      },
      () => setError("위치 권한이 필요합니다.")
    )
  }, [])

  if (error) {
    return (
      <div className="bg-widjet rounded-2xl p-7">
        <p className="text-[clamp(0.75rem,0.8vw,1rem)] font-semibold">오늘 날씨</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="bg-widjet rounded-2xl p-7">
        <p className="text-[clamp(0.75rem,0.8vw,1rem)] font-semibold">오늘 날씨</p>
        <p className="mt-2 text-sm text-muted">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="bg-widjet rounded-2xl p-7">
      <p className="text-[clamp(0.75rem,0.8vw,1rem)] font-semibold">오늘 날씨</p>
      <p className="mt-3 text-[clamp(0.7rem,0.85vw,1rem)] font-medium">{weather.city}</p>
      <div className="flex items-end gap-3 mt-2">
        <p className="text-[clamp(2rem,3.5vw,3.5rem)] font-extrabold font-ubuntu leading-none">
          {weather.temp}°
        </p>
        <p className="text-[clamp(0.6rem,0.7vw,0.85rem)] text-muted pb-1">
          최저 <span className="font-ubuntu">{weather.min}°</span> / 최고 <span className="font-ubuntu">{weather.max}°</span>
        </p>
      </div>
    </div>
  )
}
