import { useState } from "react"
import { resetPassword } from "../api/SignIn"

const floatingLabel =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"

export default function FindPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("이메일을 입력해주세요.")
      return
    }

    setLoading(true)
    const { error, errorMessage } = await resetPassword(email.trim())
    setLoading(false)

    if (error) {
      setError(errorMessage)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex h-full justify-center bg-white">
        <div className="w-[30%]">
          <div className="flex justify-center">
            <h1 className="mt-10 mb-14 text-5xl font-black">
              <a href="/">DASHBOARD</a>
            </h1>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">메일을 확인해주세요</p>
            <p className="mt-4 text-muted">
              <span className="font-medium text-primary">{email}</span>
              로 비밀번호 재설정 링크를 보냈습니다.
            </p>
            <p className="mt-2 text-sm text-muted">
              메일의 링크를 클릭하여 새 비밀번호를 설정해주세요.
            </p>
            <a
              href="/signin"
              className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              로그인으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full justify-center bg-white">
      <div className="w-[30%]">
        <div className="flex justify-center">
          <h1 className="mt-10 mb-20 text-5xl font-black">
            <a href="/">DASHBOARD</a>
          </h1>
        </div>
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="w-full">
            <p className="text-xl font-bold mb-2">비밀번호 찾기</p>
            <p className="text-sm text-muted mb-6">
              가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <div className="relative">
              <input
                className="peer h-16 w-full rounded-lg border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                type="text"
                id="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email" className={floatingLabel}>
                이메일
              </label>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </button>
            <p className="mt-4 text-center text-sm text-muted">
              <a href="/signin" className="text-primary underline">
                로그인으로 돌아가기
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
