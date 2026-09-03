import { useNavigate } from "react-router"

/* 공용 뒤로가기 버튼.
   방문 기록이 없으면(새 탭으로 열린 약관 등) fallback 경로로 보냅니다. */
export default function BackButton({ fallback = "/", label = "뒤로가기", iconOnly = false, className = "" }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      title="뒤로가기"
      aria-label="뒤로가기"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(fallback))}
      className={
        iconOnly
          ? `flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 ${className}`
          : `flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 ${className}`
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {!iconOnly && label}
    </button>
  )
}
