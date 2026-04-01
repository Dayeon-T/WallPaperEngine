import { useState } from "react"
import { useNavigate } from "react-router"
import { signUp } from "../api/SignIn"

const floatingLabel =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"

const inputBase =
  "peer h-16 w-full border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    school: "",
    subject: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if (form.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }

    setLoading(true)

    const { error, errorMessage } = await signUp(form.email, form.password, {
      name: form.name,
      school: form.school,
      subject: form.subject,
    })

    if (error) {
      setError(errorMessage)
      setLoading(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex h-full justify-center bg-white">
        <div className="w-[30%]">
          <div className="flex justify-center">
            <h1 className="mt-10 mb-14 text-5xl font-black">
              <a href="/">DASHBOARD</a>
            </h1>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">이메일을 확인해주세요</p>
            <p className="mt-4 text-muted">
              <span className="font-medium text-primary">{form.email}</span>
              로 인증 메일을 보냈습니다.
            </p>
            <p className="mt-2 text-sm text-muted">
              메일의 링크를 클릭하면 가입이 완료됩니다.
            </p>
            <a
              href="/signin"
              className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              로그인으로 이동
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
          <h1 className="mt-10 mb-14 text-5xl font-black">
            <a href="/">DASHBOARD</a>
          </h1>
        </div>
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input
                className={`${inputBase} rounded-t-lg`}
                type="text"
                id="email"
                placeholder=" "
                value={form.email}
                onChange={update("email")}
              />
              <label htmlFor="email" className={floatingLabel}>
                이메일
              </label>
            </div>
            <div className="relative">
              <input
                className={`${inputBase} border-t-0`}
                type="password"
                id="password"
                placeholder=" "
                value={form.password}
                onChange={update("password")}
              />
              <label htmlFor="password" className={floatingLabel}>
                비밀번호
              </label>
            </div>
            <div className="relative">
              <input
                className={`${inputBase} rounded-b-lg border-t-0`}
                type="password"
                id="passwordConfirm"
                placeholder=" "
                value={form.passwordConfirm}
                onChange={update("passwordConfirm")}
              />
              <label htmlFor="passwordConfirm" className={floatingLabel}>
                비밀번호 확인
              </label>
            </div>

            <div className="relative mt-6">
              <input
                className={`${inputBase} rounded-t-lg`}
                type="text"
                id="name"
                placeholder=" "
                value={form.name}
                onChange={update("name")}
              />
              <label htmlFor="name" className={floatingLabel}>
                이름
              </label>
            </div>
            <div className="relative">
              <input
                className={`${inputBase} border-t-0`}
                type="text"
                id="school"
                placeholder=" "
                value={form.school}
                onChange={update("school")}
              />
              <label htmlFor="school" className={floatingLabel}>
                학교
              </label>
            </div>
            <div className="relative">
              <input
                className={`${inputBase} rounded-b-lg border-t-0`}
                type="text"
                id="subject"
                placeholder=" "
                value={form.subject}
                onChange={update("subject")}
              />
              <label htmlFor="subject" className={floatingLabel}>
                담당 과목
              </label>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
            <p className="mt-4 text-center text-sm text-muted">
              이미 계정이 있으신가요?{" "}
              <a href="/signin" className="text-primary underline">
                로그인
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
