import { useState, useRef, useEffect } from "react"

const PRESET_COLORS = [
  "#FFCDD2", "#F8BBD0", "#E1BEE7", "#C5CAE9",
  "#BBDEFB", "#B2DFDB", "#C8E6C9", "#FFF9C4",
  "#FFE0B2", "#D7CCC8",
]

export default function TimeBlock({
  bg,
  label,
  sub,
  room: roomProp = "",
  span = 1,
  isHeader = false,
  isEditing = false,
  isToday = false,
  onDoubleClick,
  onSave,
  currentEntry,
  row,
}) {
  const [subject, setSubject] = useState(label || "")
  const [room, setRoom] = useState(roomProp || "")
  const [color, setColor] = useState(bg || "#EBEBEB")
  const [mergeNext, setMergeNext] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      setSubject(currentEntry?.subject || "")
      setRoom(currentEntry?.room || "")
      setColor(currentEntry?.color || bg || "#EBEBEB")
      setMergeNext(currentEntry ? currentEntry.end_period > currentEntry.start_period : false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) return
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        const endPeriod = mergeNext
          ? (currentEntry?.start_period ?? row) + 1
          : (currentEntry?.start_period ?? row)
        onSave?.({
          subject,
          room,
          color,
          end_period: endPeriod,
        })
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEditing, subject, room, color, mergeNext])

  const spanStyle = span > 1 ? { gridRow: `span ${span}` } : {}

  if (isHeader) {
    return (
      <div
        className={`rounded-xl flex flex-col items-center justify-center gap-1 ${isToday ? "text-white" : ""}`}
        style={{ backgroundColor: bg || "var(--tt-header-bg, #FBFBFB)" }}
      >
        {label && (
          <p className="text-[clamp(0.6rem,0.75vw,0.9rem)] font-semibold">{label}</p>
        )}
        {sub && (
          <p className={`text-[clamp(0.55rem,0.6vw,0.8rem)] font-ubuntu ${isToday ? "text-white/70" : "text-primary"}`}>{sub}</p>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="rounded-xl flex flex-col items-center justify-center gap-[2px] transition-shadow relative"
      style={{ backgroundColor: isEditing ? color : (bg || "var(--tt-empty-bg, #EBEBEB)"), ...spanStyle }}
      onDoubleClick={onDoubleClick}
    >
      {label && (
        <p className="text-[clamp(0.7rem,0.8vw,1rem)] font-semibold leading-tight relative">{label}</p>
      )}
      {roomProp && (
        <p className="text-[clamp(0.5rem,0.6vw,0.75rem)] text-primary leading-tight relative">{roomProp}</p>
      )}
      {isEditing && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-4 flex flex-col gap-3 z-50 min-w-[200px] ${row >= 6 ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <input
            ref={inputRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="과목명"
            className="w-full text-center text-sm font-semibold bg-gray-100 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[10px] text-gray-400 text-center -mt-1">3글자 이하로 입력해주세요</p>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="교실"
            className="w-full text-center text-xs bg-gray-100 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary text-muted"
          />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#4A4A4A" : "transparent",
                }}
                onClick={() => setColor(c)}
              />
            ))}
            <label className="w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-muted cursor-pointer relative">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span
                className="block w-full h-full"
                style={{ backgroundColor: color }}
              />
            </label>
          </div>
          {row < 10 && (
            <label className="flex items-center justify-center gap-1.5 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mergeNext}
                onChange={(e) => setMergeNext(e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              블록타임
            </label>
          )}
          <button
            className="w-full rounded-lg bg-primary text-white text-xs font-semibold py-2 transition hover:opacity-90"
            onClick={() => {
              const endPeriod = mergeNext
                ? (currentEntry?.start_period ?? row) + 1
                : (currentEntry?.start_period ?? row)
              onSave?.({ subject, room, color, end_period: endPeriod })
            }}
          >
            확인
          </button>
        </div>
      )}
    </div>
  )
}
