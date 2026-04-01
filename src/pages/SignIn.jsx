import { useState } from "react"
import { useNavigate } from "react-router"
import { signIn } from "../api/SignIn"

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error, errorMessage } = await signIn(email, password)

    if (error) {
      setError(errorMessage)
      setLoading(false)
      return
    }

    navigate("/")
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
            <div className="relative">
              <input
                className="peer h-16 w-full rounded-t-lg border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                type="text"
                id="email"
                name="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label
                htmlFor="email"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
              >
                이메일
              </label>
            </div>
            <div className="relative">
              <input
                className="peer h-16 w-full rounded-b-lg border border-t-0 border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                type="password"
                id="password"
                name="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label
                htmlFor="password"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
              >
                비밀번호
              </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input type="checkbox" name="remember" className="peer hidden" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:[&>svg]:opacity-100">
                <svg
                  className="h-3 w-3 opacity-0 transition-opacity"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-muted">로그인 유지</span>
            </label>
            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
