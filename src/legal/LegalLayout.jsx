import { EFFECTIVE_DATE, POLICY_VERSION } from "./policy"

/* 이용약관·개인정보처리방침 공용 껍데기.
   개인정보 보호법 제30조 제2항에 따라 정보주체가 쉽게 확인할 수 있어야 하므로
   로그인 없이 접근할 수 있는 경로에 둡니다. */
export default function LegalLayout({ title, children }) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <a href="/" className="text-2xl font-black">PLANSCHOOL</a>
        <h1 className="mt-8 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          시행일 {EFFECTIVE_DATE} · 버전 {POLICY_VERSION}
        </p>
        <div className="mt-10 space-y-8 text-[15px] leading-7 text-gray-800">
          {children}
        </div>
        <div className="mt-16 border-t border-gray-100 pt-6 text-sm text-muted">
          <a href="/terms" className="text-primary underline">이용약관</a>
          <span className="mx-2">·</span>
          <a href="/privacy" className="text-primary underline">개인정보처리방침</a>
          <span className="mx-2">·</span>
          <a href="/signup" className="text-primary underline">회원가입</a>
        </div>
      </div>
    </div>
  )
}

export function Article({ no, title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900">
        {no ? `제${no}조 ` : ""}{title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

/* 표는 좁은 화면에서 가로로만 스크롤되게 감쌉니다 */
export function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {head.map((h) => (
              <th key={h} className="border border-gray-200 px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-200 px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
