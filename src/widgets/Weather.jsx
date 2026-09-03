import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchSchoolAddress } from "../api/neis"

async function fetchForecast(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_min,temperature_2m_max&timezone=auto`
  )
  if (!res.ok) throw new Error("날씨 정보를 불러올 수 없습니다.")
  return res.json()
}

// 주소 → 좌표. 도로명 전체가 검색에 안 잡히면 "시 구" 수준으로 줄여서 재시도한다.
// 날씨는 구 단위 정확도면 충분하다.
async function geocodeAddress(address) {
  const queries = [address, address.split(" ").slice(0, 2).join(" ")]

  for (const q of queries) {
    if (!q) continue
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ko`,
      { headers: { "User-Agent": "teacherWallPaper/1.0" } }
    )
    if (!res.ok) continue
    const rows = await res.json()
    if (rows.length > 0) return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) }
  }
  return null
}

export default function Weather() {
  const { user } = useAuth()
  const [weather, setWeather] = useState(null)
  // idle: 요청 전 / loading: 불러오는 중 / ready: 표시 중 / error: 실패
  const [status, setStatus] = useState("idle")
  // permission: 위치 권한 문제 / fetch: 네트워크 등 그 외 문제
  const [errorType, setErrorType] = useState("")
  // 브라우저가 권한을 아예 차단해둔 상태면 버튼을 눌러도 허용창이 뜨지 않으므로
  // 안내 문구를 다르게 보여주기 위해 권한 상태를 따로 추적한다.
  const [permDenied, setPermDenied] = useState(false)
  const loadingRef = useRef(false)

  const meta = user?.user_metadata || {}
  const atptCode = meta.atpt_code
  const schoolCode = meta.school_code
  const schoolName = meta.school_name

  const loadByCoords = useCallback(async (lat, lon, fixedLocation) => {
    const data = await fetchForecast(lat, lon)

    let location = fixedLocation ?? ""
    if (fixedLocation === undefined) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
          { headers: { "User-Agent": "teacherWallPaper/1.0" } }
        )
        if (geoRes.ok) {
          const geo = await geoRes.json()
          const addr = geo.address || {}
          const city = addr.city || addr.town || addr.county || ""
          const district = addr.borough || addr.suburb || addr.quarter || ""
          location = [city, district].filter(Boolean).join(" ")
        }
      } catch {
        // 지역명은 부가 정보이므로 실패해도 날씨는 그대로 보여준다
      }
    }

    setWeather({
      temp: Math.round(data.current.temperature_2m),
      min: Math.round(data.daily.temperature_2m_min[0]),
      max: Math.round(data.daily.temperature_2m_max[0]),
      icon: getWeatherIcon(data.current.weather_code),
      location,
    })
    setStatus("ready")
  }, [])

  // 위치 권한이 없을 때: 계정에 설정된 학교 주소의 날씨로 대체한다.
  const loadBySchool = useCallback(async () => {
    if (!atptCode || !schoolCode) return false
    try {
      const address = await fetchSchoolAddress(atptCode, schoolCode)
      if (!address) return false
      const coords = await geocodeAddress(address)
      if (!coords) return false

      const area = address.split(" ").slice(0, 2).join(" ")
      await loadByCoords(
        coords.lat,
        coords.lon,
        `${area || schoolName || ""} (학교 위치)`.trim()
      )
      return true
    } catch {
      return false
    }
  }, [atptCode, schoolCode, schoolName, loadByCoords])

  const requestWeather = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    setStatus("loading")

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await loadByCoords(pos.coords.latitude, pos.coords.longitude)
        } catch {
          // 내 위치 날씨 조회가 실패하면 학교 위치로라도 보여준다
          if (!(await loadBySchool())) {
            setErrorType("fetch")
            setStatus("error")
          }
        } finally {
          loadingRef.current = false
        }
      },
      async (err) => {
        // 권한이 없으면 학교 위치 날씨로 대체하고, 그것도 안 되면 안내 화면
        if (await loadBySchool()) {
          loadingRef.current = false
          return
        }
        loadingRef.current = false
        // code 1 = PERMISSION_DENIED
        setErrorType(err.code === 1 ? "permission" : "fetch")
        setStatus("error")
      }
    )
  }, [loadByCoords, loadBySchool])

  useEffect(() => {
    requestWeather()
  }, [requestWeather])

  // 권한 상태를 지켜보다가 사용자가 나중에 허용하면 자동으로 다시 불러온다.
  // (Permissions API가 없는 환경도 있으므로 실패해도 무시)
  useEffect(() => {
    let permStatus
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        permStatus = p
        setPermDenied(p.state === "denied")
        p.onchange = () => {
          setPermDenied(p.state === "denied")
          if (p.state === "granted") requestWeather()
        }
      })
      .catch(() => {})
    return () => {
      if (permStatus) permStatus.onchange = null
    }
  }, [requestWeather])

  if (status === "error") {
    return (
      <div className="bg-widjet rounded-2xl p-7">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">오늘 날씨</p>
        {errorType === "permission" ? (
          <>
            <p className="mt-2 text-sm text-muted">
              위치를 허용하면 우리 동네 날씨를 보여드려요.
            </p>
            {permDenied && (
              <p className="mt-1 text-xs text-muted">
                위치가 차단되어 있어요. 브라우저 주소창의 자물쇠 → 위치를
                허용으로 바꾸면 자동으로 표시됩니다.
              </p>
            )}
            <button
              onClick={requestWeather}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              위치 허용하고 날씨 보기
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">날씨 정보를 불러올 수 없습니다.</p>
            <button
              onClick={requestWeather}
              className="mt-3 rounded-lg border border-muted px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    )
  }

  if (status !== "ready") {
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
