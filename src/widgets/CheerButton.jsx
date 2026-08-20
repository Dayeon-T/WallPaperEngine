import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchInbox, subscribeToCheer } from "../api/cheers"
import { fetchProfileRow } from "../api/settings"

export default function CheerButton() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState(null)

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

  // 이 화면은 배경화면으로 며칠씩 떠 있으므로, 실시간 수신 하나에만 기대면
  // 웹소켓이 한 번 끊긴 뒤로 개수가 영영 멈춘다.
  // (1) 자체 구독 (2) 주기적 재조회 (3) 창 복귀 시 재조회 — 세 겹으로 받는다.
  useEffect(() => {
    if (!user) return
    return subscribeToCheer(user.id, loadUnread, loadUnread)
  }, [user, loadUnread])

  useEffect(() => {
    const timer = setInterval(loadUnread, 60000)
    return () => clearInterval(timer)
  }, [loadUnread])

  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === "visible") loadUnread()
    }
    document.addEventListener("visibilitychange", onWake)
    window.addEventListener("focus", onWake)
    window.addEventListener("online", loadUnread)
    return () => {
      document.removeEventListener("visibilitychange", onWake)
      window.removeEventListener("focus", onWake)
      window.removeEventListener("online", loadUnread)
    }
  }, [loadUnread])

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

  const handleNavigate = () => {
    window.location.href = "/messages"
  }

  return (
    <div className="flex justify-end items-center h-full pr-2">
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
        </button>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[clamp(24px,2.6vw,34px)] h-[clamp(24px,2.6vw,34px)] flex items-center justify-center rounded-full bg-red-500 text-white text-[clamp(0.7rem,0.85vw,1rem)] font-bold px-1.5 pointer-events-none shadow-md ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </div>
  )
}
