import { useAuth } from "../context/AuthContext"
import { signOut } from "../api/SignIn"
import { useNavigate } from "react-router"

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  const name = user?.user_metadata?.name || "사용자"

  return (
    <div className="bg-widjet rounded-2xl pt-7">
      <div className="flex flex-col gap-2 mx-7">
        <p className="text-lg font-semibold">안녕하세요,</p>
        <p className="text-4xl font-extrabold">{name} 선생님</p>
        <p className="text-sm text-muted mb-4">{user?.email}</p>
        

        </div>
        <div className="flex flex-row gap-2 bg-btn rounded-b-2xl py-4">
          <ul className="grid w-full grid-cols-4 text-center text-sm divide-x divide-[#E5E5E5]">
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.open("https://sen.neis.go.kr/", "_blank", "width=1200,height=800") }}>
                <span>나이스</span>
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.open("https://klef.sen.go.kr/", "_blank", "width=1200,height=800") }}>
                <span>에듀파인</span>
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.open("https://classroom.google.com/", "_blank", "width=1200,height=800") }}>
                <span>클래스룸</span>
              </a>
            </li>
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
