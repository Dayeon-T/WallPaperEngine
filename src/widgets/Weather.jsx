import { useState, useEffect, useRef } from "react"

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
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_min,temperature_2m_max&timezone=auto`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
              { headers: { "User-Agent": "teacherWallPaper/1.0" } }
            ),
          ])

          if (!weatherRes.ok) throw new Error("날씨 정보를 불러올 수 없습니다.")

          const data = await weatherRes.json()

          let location = ""
          if (geoRes.ok) {
            const geo = await geoRes.json()
            const addr = geo.address || {}
            const city = addr.city || addr.town || addr.county || ""
            const district = addr.borough || addr.suburb || addr.quarter || ""
            location = [city, district].filter(Boolean).join(" ")
          }

          setWeather({
            temp: Math.round(data.current.temperature_2m),
            min: Math.round(data.daily.temperature_2m_min[0]),
            max: Math.round(data.daily.temperature_2m_max[0]),
            icon: getWeatherIcon(data.current.weather_code),
            location,
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
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">오늘 날씨</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="bg-widjet rounded-2xl p-7">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">오늘 날씨</p>
        <p className="mt-2 text-sm text-muted">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="bg-widjet rounded-2xl p-7">
      <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">오늘 날씨</p>
      {weather.location && (
        <p className="mt-2 text-[clamp(0.7rem,0.8vw,0.95rem)] font-medium text-muted">{weather.location}</p>
      )}
      <div className="flex items-end gap-3 mt-2">
        <p className="text-[clamp(2rem,3.5vw,3.5rem)] font-extrabold font-ubuntu leading-none">
          {weather.icon} {weather.temp}°
        </p>
      </div>
      <p className="mt-2 text-[clamp(0.6rem,0.7vw,0.85rem)] text-muted">
        최저 <span className="font-ubuntu">{weather.min}°</span> / 최고 <span className="font-ubuntu">{weather.max}°</span>
      </p>
    </div>
  )
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️"
  if (code <= 3) return "⛅"
  if (code <= 48) return "🌫️"
  if (code <= 57) return "🌦️"
  if (code <= 67) return "🌧️"
  if (code <= 77) return "🌨️"
  if (code <= 82) return "🌧️"
  if (code <= 86) return "🌨️"
  if (code <= 99) return "⛈️"
  return "🌡️"
}
