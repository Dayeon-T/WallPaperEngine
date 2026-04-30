import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function pad(n) {
  return String(n).padStart(2, "0")
}

function toValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseValue(value, defaultYear) {
  if (value) {
    const [y, m, d] = value.split("-").map(Number)
    if (y && m && d) return new Date(y, m - 1, d)
  }
  const today = new Date()
  if (defaultYear) return new Date(Number(defaultYear), today.getMonth(), today.getDate())
  return today
}

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return date
  })
}

export default function DateDropdown({ value, onChange, size = "default", defaultYear }) {
  const buttonRef = useRef(null)
  const pickerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [pickerStyle, setPickerStyle] = useState(null)
  const [viewDate, setViewDate] = useState(() => parseValue(value, defaultYear))

  const h = size === "small" ? "h-9" : "h-12"
  const textSize = size === "small" ? "text-xs" : "text-sm"
  const selectedDate = useMemo(() => (value ? parseValue(value, defaultYear) : null), [value, defaultYear])
  const todayValue = toValue(new Date())

  useEffect(() => {
    if (value) setViewDate(parseValue(value, defaultYear))
  }, [value, defaultYear])

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const pickerWidth = 280
    const gap = 8
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - pickerWidth - 12)
    )
    const bottomSpace = window.innerHeight - rect.bottom
    const opensUp = bottomSpace < 320 && rect.top > bottomSpace
    const top = opensUp ? Math.max(12, rect.top - 306 - gap) : rect.bottom + gap

    setPickerStyle({ left, top, width: pickerWidth })
  }

  const openPicker = () => {
    setViewDate(parseValue(value, defaultYear))
    setIsOpen(true)
    requestAnimationFrame(updatePosition)
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e) => {
      if (buttonRef.current?.contains(e.target) || pickerRef.current?.contains(e.target)) return
      setIsOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    const handleLayoutChange = () => updatePosition()

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleLayoutChange)
    window.addEventListener("scroll", handleLayoutChange, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleLayoutChange)
      window.removeEventListener("scroll", handleLayoutChange, true)
    }
  }, [isOpen])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = getCalendarDays(year, month)
  const selectedValue = selectedDate ? toValue(selectedDate) : ""

  const moveMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const selectDate = (date) => {
    onChange(toValue(date))
    setIsOpen(false)
  }

  const picker = isOpen && pickerStyle && createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[9999] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl"
      style={pickerStyle}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-gray-800">
          {year}년 {month + 1}월
        </p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className={i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const dateValue = toValue(date)
          const isCurrentMonth = date.getMonth() === month
          const isSelected = dateValue === selectedValue
          const isToday = dateValue === todayValue
          const day = date.getDay()

          return (
            <button
              key={dateValue}
              type="button"
              onClick={() => selectDate(date)}
              className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "bg-gray-900 text-white"
                    : isCurrentMonth
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-50"
              } ${!isSelected && !isToday && day === 0 ? "text-red-400" : ""} ${
                !isSelected && !isToday && day === 6 ? "text-blue-400" : ""
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => selectDate(new Date())}
          className="h-8 rounded-lg px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          오늘
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              setIsOpen(false)
            }}
            className="h-8 rounded-lg px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            지우기
          </button>
        )}
      </div>
    </div>,
    document.body
  )

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        className={`${h} min-w-[8.5rem] rounded-lg border border-gray-200 bg-white px-3 ${textSize} text-gray-700 outline-none transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary`}
      >
        {value || "날짜 선택"}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`${h} w-9 rounded-lg border border-gray-200 bg-white ${textSize} text-gray-400 outline-none transition-colors hover:border-red-200 hover:text-red-500 focus:border-primary focus:ring-1 focus:ring-primary`}
          aria-label="날짜 지우기"
        >
          x
        </button>
      )}
      {picker}
    </div>
  )
}
