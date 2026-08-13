import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { updatePassword } from "../api/settings"

const floatingLabel =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"

// 메일 링크는 #access_token=... 형태로 돌아오지만, 만료됐거나 이미 쓴 링크면
// error 정보가 대신 붙는다. 해시로 올 때도 있고 쿼리로 올 때도 있어 둘 다 확인한다.
function readLinkError() {
  const sources = [window.location.hash.slice(1), window.location.search.slice(1)]

  for (const source of sources) {
    if (!source.includes("error")) continue

    const params = new URLSearchParams(source)
    if (!params.get("error") && !params.get("error_code")) continue

    if (params.get("error_code") === "otp_expired") {
      return "링크가 만료되었습니다. 비밀번호 찾기를 다시 진행해주세요."
    }
    return (
      params.get("error_description") ||
      "링크가 올바르지 않습니다. 비밀번호 찾기를 다시 진행해주세요."
    )
  }

  return ""
}

function mapUpdateError(message) {
  if (/should be different from the old password/i.test(message)) {
    return "기존 비밀번호와 다른 비밀번호를 입력해주세요."
  }
  if (/at least/i.test(message)) {
    return "비밀번호가 너무 짧습니다."
  }
  return message || "비밀번호 변경 중 오류가 발생했습니다."
}

function Frame({ children }) {
  return (
    <div className="flex h-full justify-center bg-white">
      <div className="w-[30%]">
        <div className="flex justify-center">
          <h1 className="mt-10 mb-14 text-5xl font-black">
            <a href="/">PLANSCHOOL</a>
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ResetPassword() {
  // 링크 자체의 문제는 주소만 봐도 알 수 있으므로 첫 렌더링에서 바로 판단한다.
  const [linkError] = useState(readLinkError)

  // checking: 링크 확인 중 / ready: 입력 가능 / invalid: 링크 문제 / done: 변경 완료
  const [status, setStatus] = useState(linkError ? "invalid" : "checking")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState(linkError)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (linkError) return

    // supabase-js가 주소의 해시를 읽어 임시 세션을 만들면 그때 입력 화면을 연다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) setStatus("ready")
      }
    )

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setStatus(session ? "ready" : "invalid")
      })
      .catch(() => setStatus("invalid"))

    return () => subscription.unsubscribe()
  }, [linkError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(mapUpdateError(updateError.message))
      return
    }

    setStatus("done")
  }

  if (status === "checking") {
    return (
      <Frame>
        <p className="text-center text-muted">링크를 확인하는 중입니다...</p>
      </Frame>
    )
  }

  if (status === "invalid") {
    return (
      <Frame>
        <div className="text-center">
          <p className="text-2xl font-bold">링크를 사용할 수 없습니다</p>
          <p className="mt-4 text-muted">{error}</p>
          <p className="mt-2 text-sm text-muted">
            보안을 위해 재설정 링크는 한 번만, 1시간 동안만 사용할 수 있습니다.
          </p>
          <a
            href="/find-password"
            className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            비밀번호 찾기 다시 하기
          </a>
        </div>
      </Frame>
    )
  }

  if (status === "done") {
    return (
      <Frame>
        <div className="text-center">
          <p className="text-2xl font-bold">비밀번호가 변경되었습니다</p>
          <p className="mt-4 text-muted">
            새 비밀번호로 로그인된 상태입니다. 바로 이용하실 수 있습니다.
          </p>
          <a
            href="/"
            className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            대시보드로 가기
          </a>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="flex justify-center">
        <form onSubmit={handleSubmit} className="w-full">
          <p className="text-xl font-bold mb-2">새 비밀번호 설정</p>
          <p className="text-sm text-muted mb-6">
            사용하실 새 비밀번호를 입력해주세요. (6자 이상)
          </p>

          <div className="relative">
            <input
              className="peer h-16 w-full rounded-t-lg border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              type="password"
              id="password"
              placeholder=" "
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className={floatingLabel}>
              새 비밀번호
            </label>
          </div>

          <div className="relative">
            <input
              className="peer h-16 w-full rounded-b-lg border border-t-0 border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              type="password"
              id="passwordConfirm"
              placeholder=" "
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
            <label htmlFor="passwordConfirm" className={floatingLabel}>
              새 비밀번호 확인
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "변경 중..." : "비밀번호 변경하기"}
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            <a href="/signin" className="text-primary underline">
              로그인으로 돌아가기
            </a>
          </p>
        </form>
      </div>
    </Frame>
  )
}
