import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchInbox } from "../api/cheers"

const STORAGE_KEY = "dashboard_avatar_image"

export default function CheerButton() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [imageData, setImageData] = useState(null)
  const fileInputRef = useRef(null)

  const loadUnread = useCallback(async () => {
    if (!user) return
    const { data } = await fetchInbox(user.id)
    if (data) setUnreadCount(data.filter((m) => !m.is_read).length)
  }, [user])

  useEffect(() => { loadUnread() }, [loadUnread])

  useEffect(() => {
    const handler = () => loadUnread()
    window.addEventListener("inbox-update", handler)
    return () => window.removeEventListener("inbox-update", handler)
  }, [loadUnread])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setImageData(saved)
  }, [])

  if (!user) return null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setImageData(result)
      localStorage.setItem(STORAGE_KEY, result)
    }
    reader.readAsDataURL(file)
  }

  const handleEditClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleNavigate = () => {
    window.location.href = "/messages"
  }

  return (
    <div className="flex justify-end items-center h-full">
      <div className="relative">
        <button
          onClick={handleNavigate}
          className="relative w-[clamp(48px,5vw,72px)] h-[clamp(48px,5vw,72px)] rounded-full overflow-hidden bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center shadow-sm"
          aria-label="쪽지함"
        >
          {imageData ? (
            <img src={imageData} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[clamp(1.2rem,1.5vw,1.8rem)]">📬</span>
          )}
        </button>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 pointer-events-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <button
          onClick={handleEditClick}
          className="absolute -bottom-1 -right-1 w-[clamp(20px,2vw,28px)] h-[clamp(20px,2vw,28px)] rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center text-[clamp(0.55rem,0.7vw,0.8rem)] border border-gray-200"
          aria-label="이미지 업로드"
          title="이미지 변경"
        >
          ✎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
