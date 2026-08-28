import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { fetchBoardView } from "../api/board"

// 칠판이 재부팅 후에도 같은 학급으로 복귀하도록 코드를 기기에 저장한다.
const CODE_KEY = "board_code"

export default function Board() {
  // loading | input | connected — 저장된 코드가 있으면 자동 복귀를 시도한다
  const [phase, setPhase] = useState(() => (localStorage.getItem(CODE_KEY) ? "loading" : "input"))
  const [view, setView] = useState(null)
  const [codeInput, setCodeInput] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [now, setNow] = useState(new Date())

  // 칠판은 공용 기기다. 이 브라우저에 교사 세션이 남아 있으면
  // (실수로 로그인했던 경우 포함) 칠판 화면에 들어오는 순간 지운다.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) await supabase.auth.signOut()
    })()
  }, [])

  const connect = useCallback(async (code, { silent = false } = {}) => {
    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      if (!silent) setErrorMsg("6자리 코드를 입력해주세요.")
      return false
    }
    setConnecting(true)
    const { data, error } = await fetchBoardView(normalized)
    setConnecting(false)
    if (error || !data) {
      localStorage.removeItem(CODE_KEY)
      if (!silent) {
        setErrorMsg(error ? "연결에 실패했습니다. 잠시 후 다시 시도해주세요." : "코드를 찾을 수 없습니다. 다시 확인해주세요.")
      }
      setPhase("input")
      return false
    }
    localStorage.setItem(CODE_KEY, normalized)
    setView(data)
    setErrorMsg("")
    setPhase("connected")
    return true
  }, [])

  // 저장된 코드가 있으면 자동 복귀
  useEffect(() => {
    const saved = localStorage.getItem(CODE_KEY)
    if (saved) connect(saved, { silent: true })
  }, [connect])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!connecting) connect(codeInput)
  }

  const disconnect = () => {
    localStorage.removeItem(CODE_KEY)
    setView(null)
    setCodeInput("")
    setPhase("input")
  }

  const dateText = now.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  })
  const timeText = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  })

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-2xl">연결 중...</p>
      </div>
    )
  }

  if (phase === "input") {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-lg px-8 text-center">
          <p className="text-gray-400 text-xl mb-2">PLANSCHOOL 교실 화면</p>
          <h1 className="text-white text-4xl font-extrabold mb-10">교실 코드를 입력해주세요</h1>
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                setErrorMsg("")
              }}
              placeholder="ABC123"
              className="w-80 rounded-2xl bg-gray-800 border-2 border-gray-700 px-6 py-5 text-center text-4xl font-extrabold tracking-[0.3em] text-white placeholder-gray-600 outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={connecting || codeInput.length !== 6}
              className="w-80 rounded-2xl bg-blue-500 py-4 text-2xl font-bold text-white transition hover:bg-blue-400 disabled:opacity-40"
            >
              {connecting ? "확인 중..." : "연결하기"}
            </button>
          </form>
          {errorMsg && <p className="mt-6 text-xl text-red-400">{errorMsg}</p>}
          <p className="mt-10 text-lg text-gray-500">
            코드는 담임 선생님의 대시보드 → 설정 → 교실 화면에서 만들 수 있어요.
          </p>
        </div>
      </div>
    )
  }

  // connected — 1단계는 연결 확인까지. 시간표·급식 레이아웃은 2단계에서 채운다.
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-12 py-8">
        <p className="text-white text-5xl font-extrabold">{view?.class_name}</p>
        <p className="text-white text-5xl font-bold tabular-nums">{timeText}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-12">
        <p className="text-gray-300 text-4xl font-bold">{dateText}</p>
        <p className="text-gray-500 text-2xl">
          교실 화면이 연결되었습니다. 시간표·급식 화면은 다음 업데이트에서 표시돼요.
        </p>
        {view?.notice && (
          <p className="mt-8 text-white text-5xl font-extrabold">📢 {view.notice}</p>
        )}
      </div>
      <div className="flex justify-end px-6 py-4">
        <button
          onClick={disconnect}
          className="text-gray-700 text-sm hover:text-gray-500 transition-colors"
        >
          연결 해제
        </button>
      </div>
    </div>
  )
}
