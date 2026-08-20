import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchConsent, agreeToPolicies } from "../api/settings"
import { POLICY_VERSION, SIGNUP_CONSENT } from "./policy"

/* 동의 절차가 생기기 전에 가입한 계정은 동의 기록이 비어 있습니다.
   개인정보 보호법 제15조상 동의 없이 계속 처리할 수 없으므로,
   로그인 후 이 화면을 띄우고 동의를 받을 때까지 진행을 막습니다. */
export default function ConsentGate() {
  const { user } = useAuth()
  const [needed, setNeeded] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data } = await fetchConsent(user.id)
      // 조회에 실패하면(네트워크 등) 화면을 막지 않습니다.
      if (cancelled || !data) return
      setNeeded(!data.terms_agreed_at || !data.privacy_agreed_at)
    })()
    return () => { cancelled = true }
  }, [user])

  if (!user || !needed) return null

  const agreeAll = agreeTerms && agreePrivacy
  const toggleAll = () => {
    const next = !agreeAll
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  const handleSubmit = async () => {
    if (!agreeAll) return
    setSaving(true)
    setError("")
    const { error: err } = await agreeToPolicies(POLICY_VERSION)
    setSaving(false)
    if (err) {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.")
      return
    }
    setNeeded(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">약관 동의가 필요합니다</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          서비스 개선 과정에서 이용약관과 개인정보처리방침을 새로 마련했습니다.
          계속 이용하시려면 아래 내용을 확인하고 동의해주세요.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200">
          <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={agreeAll}
              onChange={toggleAll}
            />
            <span className="text-sm font-semibold">전체 동의합니다</span>
          </label>

          <div className="space-y-3 border-t border-gray-200 px-4 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="flex-1 text-sm">
                <span className="font-medium text-primary">[필수]</span> 이용약관에 동의합니다
              </span>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-gray-400 underline hover:text-primary"
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
                <span className="font-medium text-primary">[필수]</span> 개인정보 수집·이용에 동의합니다
              </span>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-gray-400 underline hover:text-primary"
              >
                전문 보기
              </a>
            </label>

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
                {SIGNUP_CONSENT.refusal} 동의하지 않으시려면 설정 화면에서 회원 탈퇴를 진행하실 수 있습니다.
              </p>
            </dl>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!agreeAll || saving}
          className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "저장 중..." : "동의하고 계속하기"}
        </button>
      </div>
    </div>
  )
}
