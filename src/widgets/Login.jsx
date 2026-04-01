import { useNavigate } from 'react-router'

export default function Login() {
  const navigate = useNavigate()
  return (
    <div className="bg-widjet rounded-2xl p-7">
      <div className="flex flex-col gap-2">
        <p className="text-center text-[clamp(0.7rem,0.8vw,1rem)] font-light mb-4">더 안전하고 편리하게 이용하세요.</p>
        <button
          className="bg-primary text-white rounded-lg px-[1vw] py-2 text-[clamp(0.8rem,0.9vw,1.125rem)] font-semibold mb-4"
          onClick={() => navigate('/signin')}
        >
          대시보드 로그인
        </button>
        <ul className="flex flex-row gap-7 justify-center">
          <li><a href="/find-id" className="text-muted transition hover:text-primary">아이디 찾기</a></li>
          <li><a href="/find-password" className="text-muted transition hover:text-primary">비밀번호 찾기</a></li>
          <li><a href="/signup" className="text-muted transition hover:text-primary">회원가입</a></li>
        </ul>
      </div>
    </div>
  )
}
