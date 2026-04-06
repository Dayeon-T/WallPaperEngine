import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../context/AuthContext"
import { subscribeToCheer } from "../../api/cheers"

export default function CheerToast() {
  const { user } = useAuth()
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((cheer) => {
    setToast(cheer)
    setVisible(true)
    setTimeout(() => setVisible(false), 4000)
    setTimeout(() => setToast(null), 4500)
  }, [])

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToCheer(user.id, showToast)
    return unsubscribe
  }, [user, showToast])

  if (!toast) return null

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-white/90 backdrop-blur-md shadow-lg rounded-2xl px-6 py-4 flex items-center gap-3 min-w-[280px]">
        <span className="text-2xl">💌</span>
        <div>
          <p className="text-sm font-semibold text-primary">
            {toast.from_name} 선생님의 응원
          </p>
          <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
        </div>
      </div>
    </div>
  )
}
