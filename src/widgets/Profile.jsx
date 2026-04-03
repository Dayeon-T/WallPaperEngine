import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { signOut } from "../api/SignIn"
import { fetchProfileRow } from "../api/settings"

const DEFAULT_LINKS = [
  { name: "나이스", url: "https://sen.neis.go.kr/" },
  { name: "에듀파인", url: "https://klef.sen.go.kr/" },
  { name: "클래스룸", url: "https://classroom.google.com/" },
]

export default function Profile() {
  const { user } = useAuth()
  const [links, setLinks] = useState(DEFAULT_LINKS)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.quick_links && Array.isArray(data.quick_links) && data.quick_links.length > 0) {
        setLinks(data.quick_links)
      }
    })()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  const name = user?.user_metadata?.name || "사용자"
  const cols = links.length + 1

  return (
    <div className="bg-widjet rounded-2xl pt-7">
      <div className="flex flex-col gap-2 mx-7">
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
      <div className="flex flex-row gap-2 bg-btn rounded-b-2xl py-4">
        <ul
          className="grid w-full text-center text-sm divide-x divide-[#E5E5E5]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {links.map((link, i) => (
            <li key={i}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.open(link.url, "_blank", "width=1200,height=800")
                }}
              >
                <span>{link.name}</span>
              </a>
            </li>
          ))}
          <li>
            <a href="/settings">
              <span>설정</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
