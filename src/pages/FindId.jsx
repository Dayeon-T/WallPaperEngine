import { useState } from "react"
import { findEmail } from "../api/SignIn"

const floatingLabel =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"

export default function FindId() {
  const [name, setName] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [results, setResults] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setResults(null)

    if (!name.trim()) {
      setError("이름을 입력해주세요.")
      return
    }
    if (!schoolName.trim()) {
      setError("학교 이름을 입력해주세요.")
      return
    }

    setLoading(true)
    const { data, error: rpcError } = await findEmail(name.trim(), schoolName.trim())
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message || "조회 중 오류가 발생했습니다.")
      return
    }

    setResults(data && data.length > 0 ? data : [])
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
            <p className="text-xl font-bold mb-2">아이디 찾기</p>
            <p className="text-sm text-muted mb-6">
              가입 시 등록한 이름과 학교를 입력하면 이메일(아이디)을 찾아드립니다.
            </p>
            <div className="relative">
              <input
                className="peer h-16 w-full rounded-t-lg border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                type="text"
                id="name"
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="name" className={floatingLabel}>
                이름
              </label>
            </div>
            <div className="relative">
              <input
                className="peer h-16 w-full rounded-b-lg border border-t-0 border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                type="text"
                id="schoolName"
                placeholder=" "
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              <label htmlFor="schoolName" className={floatingLabel}>
                학교 이름
              </label>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}

            {results !== null && (
              <div className="mt-4 rounded-lg bg-gray-50 p-5">
                {results.length > 0 ? (
                  <>
                    <p className="text-sm font-semibold mb-3">찾은 계정</p>
                    <div className="flex flex-col gap-2">
                      {results.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 border border-gray-200"
                        >
                          <span className="text-primary font-medium text-sm">
                            {r.masked_email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted text-center">
                    일치하는 계정이 없습니다.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "찾는 중..." : "아이디 찾기"}
            </button>
            <div className="mt-4 flex justify-center gap-4 text-sm text-muted">
              <a href="/find-password" className="text-primary underline">
                비밀번호 찾기
              </a>
              <span className="text-gray-300">|</span>
              <a href="/signin" className="text-primary underline">
                로그인으로 돌아가기
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
