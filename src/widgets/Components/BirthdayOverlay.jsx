import { useEffect, useState } from "react"
import confetti from "canvas-confetti"

export default function BirthdayOverlay({ userName }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const duration = 4000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"],
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"],
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="text-center bg-white rounded-3xl px-14 py-12 shadow-2xl max-w-md animate-[scaleIn_0.4s_ease-out]">
        <p className="text-6xl mb-4">🎂</p>
        <p className="text-2xl font-extrabold mb-2">
          생일 축하합니다!
        </p>
        <p className="text-lg text-gray-600 mb-1">
          {userName} 선생님,
        </p>
        <p className="text-gray-500">
          오늘 하루도 행복한 하루 되세요!
        </p>
        <button
          onClick={() => setVisible(false)}
          className="mt-8 rounded-xl bg-primary px-8 py-3 text-white font-semibold transition hover:opacity-90"
        >
          감사합니다
        </button>
      </div>
    </div>
  )
}
