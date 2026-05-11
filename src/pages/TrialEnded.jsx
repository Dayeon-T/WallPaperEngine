export default function TrialEnded() {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">체험 서버 운영이 종료되었습니다</h1>
        <p className="text-base leading-relaxed text-gray-300">
          한 달 동안 선생님 대시보드를 사용해주셔서 진심으로 감사드립니다.
        </p>
        <p className="text-lg font-semibold text-yellow-300">
          Lively Wallpaper에 등록된 본 배경화면을 삭제해 주세요.
        </p>
        <p className="text-sm text-gray-400">
          아래 버튼을 눌러 짧은 사용 후기를 남겨주시면 정식 서비스 개선에 큰 도움이 됩니다.
        </p>
        <a
          href="https://forms.gle/Mt7133Fm6oGYnNjq5"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
        >
          설문조사 참여하기
        </a>
      </div>
    </div>
  )
}
