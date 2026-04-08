import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../context/AuthContext"
import { subscribeToCheer } from "../../api/cheers"

export default function CheerToast() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [show, setShow] = useState(false)

  const showToast = useCallback(() => {
    setShow(true)
    setVisible(true)
    window.dispatchEvent(new Event("inbox-update"))
    setTimeout(() => setVisible(false), 4000)
    setTimeout(() => setShow(false), 4500)
  }, [])

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToCheer(user.id, showToast)
    return unsubscribe
  }, [user, showToast])

  if (!show) return null

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className="bg-white/90 backdrop-blur-md shadow-lg rounded-2xl px-6 py-4 flex items-center gap-3 min-w-[280px] cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => {
          window.location.href = "/messages"
        }}
      >
        <span className="text-2xl">💌</span>
        <div>
          <p className="text-sm font-semibold text-primary">새 쪽지가 도착했습니다</p>
          <p className="text-xs text-gray-500 mt-0.5">쪽지함을 확인해보세요!</p>
        </div>
      </div>
    </div>
  )
}
