import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { NEIS_KEY } from "../api/neis"

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function getDayLabel(offset) {
  if (offset === 0) return "오늘"
  if (offset === -1) return "어제"
  if (offset === 1) return "내일"
  const target = addDays(new Date(), offset)
  return `${target.getMonth() + 1}월 ${target.getDate()}일`
}

export default function SchoolMeals() {
  const { user } = useAuth()
  const [dayOffset, setDayOffset] = useState(0)
  const [lunch, setLunch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const atptCode = user?.user_metadata?.atpt_code
  const schoolCode = user?.user_metadata?.school_code

  const fetchMeals = useCallback(async () => {
    if (!atptCode || !schoolCode) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError("")
      setLunch(null)

      const target = addDays(new Date(), dayOffset)
      const MLSV_YMD = formatYmd(target)

      const url =
        `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=10` +
        `&MLSV_YMD=${MLSV_YMD}&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}`

      const response = await fetch(url)
      const data = await response.json()

      const rows = data.mealServiceDietInfo?.[1]?.row ?? []
      const lunchRow = rows.find((meal) => meal.MMEAL_SC_NM === "중식")

      if (lunchRow) {
        setLunch({
          dishes: lunchRow.DDISH_NM.split("<br/>"),
          calories: lunchRow.CAL_INFO,
        })
      }
    } catch (e) {
      console.error(e)
      setError("급식 정보를 불러올 수 없습니다.")
    } finally {
      setLoading(false)
    }
  }, [dayOffset, atptCode, schoolCode])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  if (!atptCode || !schoolCode) {
    return (
      <div className="bg-widjet rounded-2xl p-7">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">급식 정보</p>
        <p className="mt-4 text-sm text-muted">학교 정보를 설정해주세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-widjet rounded-2xl p-7">
      <div className="flex items-center justify-between">
        <p className="text-[clamp(0.9rem,1vw,1.25rem)] font-semibold">급식 정보</p>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setDayOffset((p) => p - 1)}
            className="hover:opacity-60 transition-opacity"
          >
            ◀
          </button>
          <span className="min-w-[5em] text-center font-medium">{getDayLabel(dayOffset)}</span>
          <button
            onClick={() => setDayOffset((p) => p + 1)}
            className="hover:opacity-60 transition-opacity"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading && <p className="text-sm text-muted">불러오는 중...</p>}
        {error && <p className="text-sm text-muted">{error}</p>}

        {!loading && !error && !lunch && (
          <p className="text-sm text-muted">중식 정보가 없습니다.</p>
        )}

        {!loading && !error && lunch && (
          <div>
            <ul className="list-disc pl-5">
              {lunch.dishes.map((dish, index) => (
                <li key={index}>{dish}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              🔥 {lunch.calories}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
