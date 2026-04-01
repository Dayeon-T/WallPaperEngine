import { useState, useEffect, useRef } from "react"

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

async function fetchOpenMeteoWeather(lat, lon) {
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_min,temperature_2m_max&timezone=auto`
  )

  if (!weatherRes.ok) {
    throw new Error("날씨 정보를 불러올 수 없습니다.")
  }

  const weatherData = await weatherRes.json()

  return {
    temp: Math.round(weatherData.current.temperature_2m),
    min: Math.round(weatherData.daily.temperature_2m_min[0]),
    max: Math.round(weatherData.daily.temperature_2m_max[0]),
    city: "현재 위치",
  }
}

export default function Weather() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState("")
  const requestedRef = useRef(false)

  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          if (!API_KEY) {
            const fallbackWeather = await fetchOpenMeteoWeather(lat, lon)
            setWeather(fallbackWeather)
            return
          }

          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${API_KEY}`
          )
          const data = await res.json()

          if (!res.ok && res.status === 401) {
            const fallbackWeather = await fetchOpenMeteoWeather(lat, lon)
            setWeather(fallbackWeather)
            return
          }

          if (!res.ok) {
            setError(data?.message || "날씨 정보를 불러올 수 없습니다.")
            return
          }

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
      <p className="mt-3 text-[clamp(0.7rem,0.85vw,1rem)] font-medium">현재 위치</p>
      {weather.city && weather.city !== "현재 위치" && (
        <p className="mt-1 text-xs text-muted">{weather.city}</p>
      )}
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
