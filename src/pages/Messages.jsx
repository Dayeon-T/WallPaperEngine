import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import {
  fetchColleagues,
  sendCheer,
  fetchInbox,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  joinPresence,
} from "../api/cheers"

const PRESET_MESSAGES = [
  "오늘도 파이팅!",
  "고생하셨어요 ☺",
  "항상 응원합니다!",
  "좋은 하루 보내세요!",
  "힘내세요, 선생님!",
  "멋져요! 👏",
]

const inputClass =
  "h-12 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const btnPrimary =
  "rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"

const TABS = [
  { id: "inbox", label: "받은 쪽지" },
  { id: "sent", label: "보내기" },
]

export default function Messages() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("inbox")
  const [msg, setMsg] = useState({ text: "", type: "" })
  const showMsg = (text, type = "success") => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: "", type: "" }), 3000)
  }

  useEffect(() => {
    if (!user) return
    const leave = joinPresence(user)
    return leave
  }, [user])

  if (!user) return null

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-[1.5vw]">
      <div />
      <div className="col-span-3 flex bg-white rounded-2xl overflow-hidden">
        <nav className="w-52 shrink-0 border-r border-gray-100 p-6 flex flex-col gap-1">
          <a href="/" className="text-xl font-black mb-8 block">DASHBOARD</a>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-left px-4 py-2.5 rounded-lg text-sm transition ${
                activeTab === t.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="mt-auto pt-4">
            <a
              href="/settings"
              className="text-xs text-gray-400 hover:text-gray-600 px-4 transition-colors"
            >
              ← 설정으로
            </a>
          </div>
        </nav>

        <main className="flex-1 p-10 overflow-y-auto">
          {msg.text && (
            <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              msg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>
              {msg.text}
            </div>
          )}

          {activeTab === "inbox" && (
            <InboxSection user={user} showMsg={showMsg} />
          )}
          {activeTab === "sent" && (
            <SendSection user={user} showMsg={showMsg} />
          )}
        </main>
      </div>
    </div>
  )
}

function InboxSection({ user, showMsg }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [replyMsg, setReplyMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [colleagues, setColleagues] = useState([])

  const load = useCallback(async () => {
    const { data } = await fetchInbox(user.id)
    if (data) setMessages(data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const meta = user.user_metadata || {}
    if (!meta.atpt_code || !meta.school_code) return
    ;(async () => {
      const { data } = await fetchColleagues(meta.atpt_code, meta.school_code, user.id)
      if (data) setColleagues(data)
    })()
  }, [user])

  const handleRead = async (msg) => {
    if (!msg.is_read) {
      await markAsRead(msg.id)
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m))
    }
    setSelected(msg.id === selected ? null : msg.id)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead(user.id)
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
    showMsg("모두 읽음 처리되었습니다.")
  }

  const handleDelete = async (id) => {
    await deleteMessage(id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
    if (selected === id) setSelected(null)
    showMsg("쪽지가 삭제되었습니다.")
  }

  const handleReply = async () => {
    if (!replyMsg.trim() || !replyTo) return
    setSending(true)
    const fromName = user.user_metadata?.name || "익명"
    await sendCheer(user.id, fromName, replyTo, replyMsg.trim())
    setSending(false)
    setReplyTo(null)
    setReplyMsg("")
    showMsg("답장을 보냈습니다.")
  }

  const formatTime = (ts) => {
    if (!ts) return ""
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    if (isToday) return `오늘 ${time}`
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `어제 ${time}`
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`
  }

  const unreadCount = messages.filter((m) => !m.is_read).length

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">받은 쪽지</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-primary mt-1">읽지 않은 쪽지 {unreadCount}개</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            모두 읽음
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">아직 도착한 쪽지가 없습니다.</p>
      )}

      <div className="flex flex-col gap-2">
        {messages.map((m) => {
          const isOpen = selected === m.id
          return (
            <div key={m.id} className="group">
              <div
                onClick={() => handleRead(m)}
                className={`flex items-center gap-4 rounded-xl px-5 py-4 cursor-pointer transition-colors ${
                  m.is_read
                    ? "bg-gray-50 hover:bg-gray-100"
                    : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <span className="text-lg shrink-0">{m.is_read ? "📭" : "💌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${m.is_read ? "text-gray-600" : "text-primary font-semibold"}`}>
                      {m.from_name} 선생님
                    </p>
                    {!m.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 truncate ${m.is_read ? "text-gray-500" : "text-gray-700"}`}>
                    {m.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatTime(m.created_at)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-all shrink-0"
                >
                  삭제
                </button>
              </div>

              {isOpen && (
                <div className="ml-12 mt-2 mb-2 p-4 rounded-xl bg-white border border-gray-100">
                  <p className="text-sm text-gray-700 mb-3">{m.message}</p>
                  {replyTo === m.from_id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className={inputClass}
                        placeholder="답장 내용을 입력하세요"
                        value={replyMsg}
                        onChange={(e) => setReplyMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReply()}
                        maxLength={100}
                      />
                      <div className="flex gap-2">
                        <button className={btnPrimary} disabled={sending || !replyMsg.trim()} onClick={handleReply}>
                          {sending ? "보내는 중..." : "보내기"}
                        </button>
                        <button
                          onClick={() => { setReplyTo(null); setReplyMsg("") }}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyTo(m.from_id)}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      답장하기
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SendSection({ user, showMsg }) {
  const [colleagues, setColleagues] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState("")
  const [customMsg, setCustomMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [onlineIds, setOnlineIds] = useState(new Set())

  useEffect(() => {
    const meta = user.user_metadata || {}
    if (!meta.atpt_code || !meta.school_code) return
    ;(async () => {
      const { data } = await fetchColleagues(meta.atpt_code, meta.school_code, user.id)
      if (data) setColleagues(data)
    })()
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      const state = e.detail || {}
      const ids = new Set()
      for (const key of Object.keys(state)) {
        ids.add(key)
      }
      setOnlineIds(ids)
    }
    window.addEventListener("presence-sync", handler)
    return () => window.removeEventListener("presence-sync", handler)
  }, [])

  const handleSend = async () => {
    const finalMsg = message === "__custom__" ? customMsg.trim() : message
    if (!selectedId || !finalMsg) return
    setSending(true)
    const fromName = user.user_metadata?.name || "익명"
    await sendCheer(user.id, fromName, selectedId, finalMsg)
    setSending(false)
    setSelectedId(null)
    setMessage("")
    setCustomMsg("")
    showMsg("쪽지를 보냈습니다!")
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">쪽지 보내기</h2>

      {colleagues.length === 0 ? (
        <p className="text-sm text-gray-400">같은 학교 선생님이 없습니다.</p>
      ) : (
        <div className="max-w-lg flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">받는 사람</p>
            <div className="flex flex-wrap gap-2">
              {colleagues.map((c) => {
                const isOnline = onlineIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`relative px-4 py-2 rounded-full text-sm transition ${
                      selectedId === c.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {isOnline && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                    )}
                    {c.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              초록점은 현재 대시보드에 접속 중인 선생님입니다.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">빠른 메시지</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  onClick={() => { setMessage(msg); setCustomMsg("") }}
                  className={`px-3.5 py-2 rounded-xl text-sm transition ${
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
                className={`px-3.5 py-2 rounded-xl text-sm transition ${
                  message === "__custom__"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                직접 입력
              </button>
            </div>
          </div>

          {message === "__custom__" && (
            <div>
              <p className="text-sm font-semibold mb-2">메시지</p>
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="쪽지 내용을 입력하세요"
                maxLength={200}
                rows={3}
                className="h-24 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{customMsg.length}/200</p>
            </div>
          )}

          <button
            className={btnPrimary}
            disabled={!selectedId || (!message || (message === "__custom__" && !customMsg.trim())) || sending}
            onClick={handleSend}
          >
            {sending ? "보내는 중..." : "쪽지 보내기 ✉️"}
          </button>
        </div>
      )}
    </div>
  )
}
