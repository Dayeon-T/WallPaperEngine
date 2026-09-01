import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { signOut } from "../api/SignIn"
import { fetchProfileRow } from "../api/settings"
import { getDefaultQuickLinks } from "../api/neis"

export default function Profile() {
  const { user } = useAuth()
  // 직접 저장한 퀵링크가 없으면 소속 교육청에 맞는 나이스·에듀파인 주소를 보여준다
  const [links, setLinks] = useState(() => getDefaultQuickLinks(user?.user_metadata?.atpt_code))
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.quick_links && Array.isArray(data.quick_links) && data.quick_links.length > 0) {
        setLinks(data.quick_links)
      } else {
        setLinks(getDefaultQuickLinks(user.user_metadata?.atpt_code))
      }
    })()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  const name = user?.user_metadata?.name || "사용자"
  const allItems = [
    ...links.map((link) => ({ type: "link", ...link })),
    { type: "settings" },
  ]
  const needsTwoRows = allItems.length > 4
  const row1 = needsTwoRows ? allItems.slice(0, 4) : allItems
  const row2 = needsTwoRows ? allItems.slice(4) : []

  const renderItem = (item, i) => (
    <li key={i}>
      {item.type === "settings" ? (
        <a href="/settings"><span>설정</span></a>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <span>{item.name}</span>
        </a>
      )}
    </li>
  )

  return (
    <div className="bg-widjet rounded-2xl pt-7 h-full flex flex-col">
      {/* 위젯이 세로로 늘어나면 이 영역이 늘어나고 퀵링크 바는 바닥에 붙는다 */}
      <div className="flex flex-col gap-2 mx-7 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <p className="text-[clamp(0.8rem,0.9vw,1.125rem)] font-semibold">안녕하세요,</p>
          <button
            onClick={handleSignOut}
            className="text-[clamp(0.6rem,0.65vw,0.8rem)] text-muted hover:text-gray-800 transition-colors"
          >
            로그아웃
          </button>
        </div>
        <p className="text-[clamp(1.2rem,2vw,2.25rem)] font-extrabold">{name} 선생님</p>
        <p className="text-[clamp(0.6rem,0.7vw,0.875rem)] text-muted mb-4">{user?.email}</p>
      </div>
      <div className="flex flex-col bg-btn rounded-b-2xl py-3 gap-2 shrink-0">
        <ul
          className="grid w-full text-center text-sm divide-x divide-[#E5E5E5]"
          style={{ gridTemplateColumns: `repeat(${row1.length}, minmax(0, 1fr))` }}
        >
          {row1.map(renderItem)}
        </ul>
        {row2.length > 0 && (
          <>
          <hr className="border-t border-[#E5E5E5] mx-4" />
          <ul
            className="grid w-full text-center text-sm divide-x divide-[#E5E5E5]"
            style={{ gridTemplateColumns: `repeat(${row2.length}, minmax(0, 1fr))` }}
          >
            {row2.map(renderItem)}
          </ul>
          </>
        )}
      </div>
    </div>
  )
}
