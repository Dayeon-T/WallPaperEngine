import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchColleagues, sendCheer } from "../api/cheers"

const PRESET_MESSAGES = [
  "오늘도 파이팅!",
  "고생하셨어요 ☺",
  "항상 응원합니다!",
  "좋은 하루 보내세요!",
  "힘내세요, 선생님!",
  "멋져요! 👏",
]

export default function CheerButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [colleagues, setColleagues] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState("")
  const [customMsg, setCustomMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const popupRef = useRef(null)

  useEffect(() => {
    if (!open || !user) return
    const meta = user.user_metadata || {}
    if (!meta.atpt_code || !meta.school_code) return
    ;(async () => {
      const { data } = await fetchColleagues(meta.atpt_code, meta.school_code, user.id)
      if (data) setColleagues(data)
    })()
  }, [open, user])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        handleClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleClose = () => {
    setOpen(false)
    setSelectedId(null)
    setMessage("")
    setCustomMsg("")
    setSent(false)
  }

  const handleSend = async () => {
    const finalMsg = message === "__custom__" ? customMsg.trim() : message
    if (!selectedId || !finalMsg || !user) return
    setSending(true)
    const fromName = user.user_metadata?.name || "익명"
    await sendCheer(user.id, fromName, selectedId, finalMsg)
    setSending(false)
    setSent(true)
    setTimeout(handleClose, 1500)
  }

  if (!user) return null

  const FEATURE_LINK = "https://www.miricanvas.com/v2/ko/design2/v/5b53facf-22b1-4a38-955c-cc103c92e2f3"

  return (
    <div className="relative flex justify-end gap-2">
      <button
        onClick={() => window.open(FEATURE_LINK, "_blank", "width=1200,height=800")}
        className="flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[clamp(0.6rem,0.7vw,0.8rem)] text-primary font-medium transition-colors"
      >
        <span>📋</span>
        기능 보기
      </button>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[clamp(0.6rem,0.7vw,0.8rem)] text-primary font-medium transition-colors"
      >
        <span>💌</span>
        응원 보내기
      </button>

      {open && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl p-5 flex flex-col gap-4 z-50 min-w-[260px] max-w-[300px]"
        >
          {sent ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✨</p>
              <p className="text-sm font-semibold text-primary">응원을 보냈습니다!</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">응원 보내기</p>

              {colleagues.length === 0 ? (
                <p className="text-xs text-muted text-center py-2">
                  같은 학교 선생님이 없습니다.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted mb-2">누구에게?</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {colleagues.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`px-3 py-1.5 rounded-full text-xs transition ${
                            selectedId === c.id
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted mb-2">메시지</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_MESSAGES.map((msg) => (
                        <button
                          key={msg}
                          onClick={() => { setMessage(msg); setCustomMsg("") }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                            message === msg
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {msg}
                        </button>
                      ))}
                      <button
                        onClick={() => setMessage("__custom__")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                          message === "__custom__"
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        직접 입력
                      </button>
                    </div>
                    {message === "__custom__" && (
                      <input
                        type="text"
                        value={customMsg}
                        onChange={(e) => setCustomMsg(e.target.value)}
                        placeholder="응원 메시지를 입력하세요"
                        maxLength={50}
                        className="w-full mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!selectedId || (!message || (message === "__custom__" && !customMsg.trim())) || sending}
                    className="w-full rounded-lg bg-primary text-white text-xs font-semibold py-2.5 transition hover:opacity-90 disabled:opacity-40"
                  >
                    {sending ? "보내는 중..." : "보내기 💌"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
