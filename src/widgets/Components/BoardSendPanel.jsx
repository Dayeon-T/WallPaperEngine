import { useState, useEffect } from "react"
import { fetchMyBoard, updateBoardNotice, signalBoardCode } from "../../api/board"

// 대시보드의 "교실 화면" 버튼이 여는 교실로 보내기 패널.
// 공지(선생님 말씀)를 칠판 맨 윗줄에 띄우거나 내린다.
export default function BoardSendPanel({ user, onClose }) {
  const [board, setBoard] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState("")
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    (async () => {
      const { data } = await fetchMyBoard(user.id)
      setBoard(data || null)
      setText(data?.notice || "")
      setLoaded(true)
    })()
  }, [user.id])

  const send = async () => {
    const notice = text.trim()
    if (!notice) return
    setWorking(true)
    const { error } = await updateBoardNotice(user.id, notice)
    setWorking(false)
    if (error) { setStatus("전송에 실패했습니다: " + error.message); return }
    setBoard((prev) => ({ ...prev, notice }))
    signalBoardCode(board.board_code)
    setStatus("칠판에 띄웠어요!")
  }

  const clear = async () => {
    setWorking(true)
    const { error } = await updateBoardNotice(user.id, null)
    setWorking(false)
    if (error) { setStatus("실패했습니다: " + error.message); return }
    setBoard((prev) => ({ ...prev, notice: null }))
    setText("")
    signalBoardCode(board.board_code)
    setStatus("공지를 내렸어요.")
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-[26rem] max-w-[90vw] rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">교실로 보내기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {!loaded ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : !board ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              아직 교실 화면이 연결되지 않았어요.
              설정에서 교실 코드를 만들고 전자칠판과 연결해주세요.
            </p>
            <a
              href="/settings"
              className="rounded-lg bg-primary px-6 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
            >
              설정에서 교실 코드 만들기
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                선생님 말씀 <span className="text-gray-400">(칠판 맨 위에 크게 표시, 내리기 전까지 유지)</span>
              </label>
              <textarea
                autoFocus
                rows={3}
                maxLength={200}
                value={text}
                onChange={(e) => { setText(e.target.value); setStatus("") }}
                placeholder="예: 3교시 후 체육관으로 이동"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={send}
                disabled={working || !text.trim()}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                칠판에 띄우기
              </button>
              {board.notice && (
                <button
                  onClick={clear}
                  disabled={working}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  공지 내리기
                </button>
              )}
            </div>
            {status && <p className="text-sm text-primary">{status}</p>}
            <a
              href={`/board?code=${board.board_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 self-start"
            >
              칠판 화면 미리보기 ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
