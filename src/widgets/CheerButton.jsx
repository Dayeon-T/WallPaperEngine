import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchInbox } from "../api/cheers"

export default function CheerButton() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

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

  if (!user) return null

  const FEATURE_LINK = "https://www.miricanvas.com/v2/ko/design2/v/5b53facf-22b1-4a38-955c-cc103c92e2f3"

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => window.open(FEATURE_LINK, "_blank", "width=1200,height=800")}
        className="flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[clamp(0.6rem,0.7vw,0.8rem)] text-primary font-medium transition-colors"
      >
        <span>📋</span>
        기능 보기
      </button>
      <a
        href="/messages"
        className="relative flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[clamp(0.6rem,0.7vw,0.8rem)] text-primary font-medium transition-colors no-underline"
      >
        <span>📬</span>
        쪽지함
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </a>
    </div>
  )
}
