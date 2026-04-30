import { useRef } from "react"

export default function DateDropdown({ value, onChange, size = "default", defaultYear }) {
  const inputRef = useRef(null)
  const h = size === "small" ? "h-9" : "h-12"
  const textSize = size === "small" ? "text-xs" : "text-sm"
  const fallbackDate = defaultYear ? `${defaultYear}-01-01` : ""

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    if (!input.value && fallbackDate) input.value = fallbackDate
    input.focus()
    if (typeof input.showPicker === "function") input.showPicker()
    else input.click()
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <button
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
    </div>
  )
}
