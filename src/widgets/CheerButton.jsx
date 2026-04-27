import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchInbox } from "../api/cheers"
import { fetchProfileRow, uploadAvatar } from "../api/settings"

export default function CheerButton() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const loadUnread = useCallback(async () => {
    if (!user) return
    const { data } = await fetchInbox(user.id)
    if (data) setUnreadCount(data.filter((m) => !m.is_read).length)
  }, [user])

  const loadAvatar = useCallback(async () => {
    if (!user) return
    const { data } = await fetchProfileRow(user.id)
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }, [user])

  useEffect(() => { loadUnread() }, [loadUnread])
  useEffect(() => { loadAvatar() }, [loadAvatar])

  useEffect(() => {
    const handler = () => loadUnread()
    window.addEventListener("inbox-update", handler)
    return () => window.removeEventListener("inbox-update", handler)
  }, [loadUnread])

  useEffect(() => {
    const handler = () => loadAvatar()
    window.addEventListener("avatar-change", handler)
    return () => window.removeEventListener("avatar-change", handler)
  }, [loadAvatar])

  if (!user) return null

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const { data, error } = await uploadAvatar(user.id, file)
    setUploading(false)
    if (!error && data) {
      setAvatarUrl(data)
      window.dispatchEvent(new Event("avatar-change"))
    }
    e.target.value = ""
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
          className="relative w-[clamp(96px,10vw,150px)] h-[clamp(96px,10vw,150px)] rounded-full overflow-hidden bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center shadow-sm"
          aria-label="쪽지함"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[clamp(2.2rem,3vw,3.6rem)]">📬</span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">
              업로드 중...
            </span>
          )}
        </button>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold px-1 pointer-events-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <button
          onClick={handleEditClick}
          className="absolute bottom-1 right-1 w-[clamp(28px,3vw,42px)] h-[clamp(28px,3vw,42px)] rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center text-[clamp(0.75rem,1vw,1.2rem)] border border-gray-200"
          aria-label="이미지 업로드"
          title="프로필 사진 변경"
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
