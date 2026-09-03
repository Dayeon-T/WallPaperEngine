import { useState, useEffect, useRef } from "react"
import { signUp } from "../api/SignIn"
import BackButton from "../components/BackButton"
import { EDUCATION_OFFICES, searchSchools } from "../api/neis"
import { POLICY_VERSION, SIGNUP_CONSENT } from "../legal/policy"

// 만 나이. 생년월일을 필수로 받는 목적 중 하나가 만 14세 이상 확인이므로
// (개인정보 보호법 제22조의2) 가입 단계에서 실제로 검증합니다.
function koreanAge(birthday) {
  const b = new Date(birthday)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const monthDiff = now.getMonth() - b.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--
  return age
}

const floatingLabel =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"

const inputBase =
  "peer h-16 w-full border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"

export default function SignUp() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    atptCode: "",
    schoolCode: "",
    schoolName: "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // 개인정보 보호법 제22조: 약관 동의와 개인정보 동의는 각각 따로 받아야 합니다.
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const agreeAll = agreeTerms && agreePrivacy
  const toggleAll = () => {
    const next = !agreeAll
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  const [schoolQuery, setSchoolQuery] = useState("")
  const [schoolResults, setSchoolResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const dropdownRef = useRef(null)

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  useEffect(() => {
    if (!form.atptCode || schoolQuery.length < 2) {
      setSchoolResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchSchools(form.atptCode, schoolQuery)
        setSchoolResults(results)
        setShowDropdown(true)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [schoolQuery, form.atptCode])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectSchool = (school) => {
    setForm((prev) => ({
      ...prev,
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
    }))
    setSchoolQuery(school.schoolName)
    setShowDropdown(false)
  }

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

    if (!form.schoolCode) {
      setError("학교를 검색하여 선택해주세요.")
      return
    }

    if (!form.birthYear || !form.birthMonth || !form.birthDay) {
      setError("생년월일을 모두 선택해주세요.")
      return
    }

    const birthday = `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`

    if (koreanAge(birthday) < 14) {
      setError("만 14세 미만은 가입할 수 없습니다.")
      return
    }

    if (!agreeTerms || !agreePrivacy) {
      setError("필수 항목에 모두 동의해주세요.")
      return
    }

    setLoading(true)

    const { error, errorMessage } = await signUp(form.email, form.password, {
      name: form.name,
      school_name: form.schoolName,
      atpt_code: form.atptCode,
      school_code: form.schoolCode,
      birthday,
      // 동의 사실과 동의한 문서 버전을 남깁니다. 동의 시각은 DB 트리거가 기록합니다.
      terms_agreed: "true",
      privacy_agreed: "true",
      policy_version: POLICY_VERSION,
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
      <div className="relative flex h-full justify-center bg-white">
        <BackButton className="absolute left-5 top-5" />
        <div className="w-[30%]">
          <div className="flex justify-center">
            <h1 className="mt-10 mb-14 text-5xl font-black">
              <a href="/">PLANSCHOOL</a>
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
    <div className="relative flex h-full justify-center bg-white">
      <BackButton className="absolute left-5 top-5" />
      <div className="w-[30%]">
        <div className="flex justify-center">
          <h1 className="mt-10 mb-14 text-5xl font-black">
            <a href="/">PLANSCHOOL</a>
          </h1>
        </div>
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="w-full">
            {/* 이메일 / 비밀번호 */}
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

            {/* 이름 */}
            <div className="relative mt-6">
              <input
                className={`${inputBase} rounded-lg`}
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

            {/* 교육청 + 학교 */}
            <div className="relative mt-6">
              <select
                className="h-16 w-full rounded-t-lg border border-muted px-4 pt-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm appearance-none bg-white"
                id="atptCode"
                value={form.atptCode}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    atptCode: e.target.value,
                    schoolCode: "",
                    schoolName: "",
                  }))
                  setSchoolQuery("")
                  setSchoolResults([])
                }}
              >
                <option value="">교육청을 선택하세요</option>
                {EDUCATION_OFFICES.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
              <label
                htmlFor="atptCode"
                className="pointer-events-none absolute left-4 top-2 text-xs text-muted"
              >
                소속 교육청
              </label>
            </div>
            <div className="relative" ref={dropdownRef}>
              <input
                className={`${inputBase} rounded-b-lg border-t-0`}
                type="text"
                id="school"
                placeholder=" "
                disabled={!form.atptCode}
                value={schoolQuery}
                onChange={(e) => {
                  setSchoolQuery(e.target.value)
                  setForm((prev) => ({ ...prev, schoolCode: "", schoolName: "" }))
                }}
                onFocus={() => schoolResults.length > 0 && setShowDropdown(true)}
              />
              <label htmlFor="school" className={floatingLabel}>
                {form.schoolName
                  ? `✓ ${form.schoolName}`
                  : "학교 검색"}
              </label>
              {showDropdown && schoolResults.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-muted bg-white shadow-lg">
                  {schoolResults.map((s) => (
                    <li
                      key={s.schoolCode}
                      className="cursor-pointer px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => selectSchool(s)}
                    >
                      <p className="text-sm font-medium">{s.schoolName}</p>
                      {s.address && (
                        <p className="text-xs text-muted mt-0.5">{s.address}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {searching && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">
                  검색 중...
                </span>
              )}
            </div>

            {/* 생일 */}
            <div className="mt-6">
              <p className="text-xs text-muted mb-2 ml-1">
                생년월일 <span className="text-primary">(필수)</span>
                <span className="ml-1 text-muted">· 만 14세 이상만 가입할 수 있습니다</span>
              </p>
              <div className="flex gap-2">
                <select
                  className="h-14 flex-1 rounded-lg border border-muted px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white appearance-none"
                  value={form.birthYear}
                  onChange={update("birthYear")}
                >
                  <option value="">년</option>
                  {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={String(y)}>{y}년</option>
                  ))}
                </select>
                <select
                  className="h-14 flex-1 rounded-lg border border-muted px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white appearance-none"
                  value={form.birthMonth}
                  onChange={update("birthMonth")}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>{m}월</option>
                  ))}
                </select>
                <select
                  className="h-14 flex-1 rounded-lg border border-muted px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white appearance-none"
                  value={form.birthDay}
                  onChange={update("birthDay")}
                >
                  <option value="">일</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>{d}일</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 약관 동의 — 개인정보 보호법 제22조에 따라 항목별로 각각 받습니다.
                "전체 동의"는 편의 기능일 뿐, 아래 개별 동의가 실제 동의입니다. */}
            <div className="mt-8 rounded-lg border border-muted">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={agreeAll}
                  onChange={toggleAll}
                />
                <span className="text-sm font-semibold">전체 동의합니다</span>
              </label>

              <div className="border-t border-muted px-4 py-3 space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span className="flex-1 text-sm">
                    <span className="text-primary font-medium">[필수]</span> 이용약관에 동의합니다
                  </span>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-muted underline hover:text-primary"
                  >
                    전문 보기
                  </a>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  <span className="flex-1 text-sm">
                    <span className="text-primary font-medium">[필수]</span> 개인정보 수집·이용에 동의합니다
                  </span>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-muted underline hover:text-primary"
                  >
                    전문 보기
                  </a>
                </label>

                {/* 제15조 제2항: 목적·항목·보유기간·거부권을 동의 시점에 모두 알려야 합니다 */}
                <dl className="rounded-md bg-gray-50 px-3 py-2.5 text-xs leading-5 text-gray-600">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold text-gray-500">수집 목적</dt>
                    <dd className="flex-1">{SIGNUP_CONSENT.purpose}</dd>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold text-gray-500">수집 항목</dt>
                    <dd className="flex-1">{SIGNUP_CONSENT.items}</dd>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold text-gray-500">보유 기간</dt>
                    <dd className="flex-1">{SIGNUP_CONSENT.period}</dd>
                  </div>
                  <p className="mt-2 border-t border-gray-200 pt-2 text-gray-500">
                    {SIGNUP_CONSENT.refusal}
                  </p>
                </dl>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !agreeTerms || !agreePrivacy}
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
            <p className="mt-8 mb-10 text-center text-xs text-muted">
              <a href="/terms" className="underline hover:text-primary">이용약관</a>
              <span className="mx-1.5">·</span>
              <a href="/privacy" className="underline hover:text-primary">개인정보처리방침</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
