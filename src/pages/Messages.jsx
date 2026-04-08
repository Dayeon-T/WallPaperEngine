import { useState, useEffect, useCallback, useMemo } from "react"
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
  { id: "inbox", label: "받은 쪽지", icon: "📬" },
  { id: "send", label: "쪽지 보내기", icon: "✏️" },
]

const PAGE_SIZE = 6

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
              className={`text-left px-4 py-2.5 rounded-lg text-sm transition flex items-center gap-2 ${
                activeTab === t.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 flex flex-col overflow-hidden p-8">
          {msg.text && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm shrink-0 ${
              msg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>
              {msg.text}
            </div>
          )}

          {activeTab === "inbox" && <InboxSection user={user} showMsg={showMsg} />}
          {activeTab === "send" && <SendSection user={user} showMsg={showMsg} />}
        </main>
      </div>
    </div>
  )
}

/* ───────── 받은 쪽지 ───────── */
function InboxSection({ user, showMsg }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [replyTo, setReplyTo] = useState(null)
  const [replyMsg, setReplyMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const load = useCallback(async () => {
    const { data } = await fetchInbox(user.id)
    if (data) setMessages(data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = messages
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      list = list.filter(
        (m) =>
          m.message.toLowerCase().includes(kw) ||
          (m.from_name || "").toLowerCase().includes(kw)
      )
    }
    if (dateFilter) {
      list = list.filter((m) => {
        const d = new Date(m.created_at)
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        return ds === dateFilter
      })
    }
    return list
  }, [messages, keyword, dateFilter])

  const unreadCount = messages.filter((m) => !m.is_read).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [keyword, dateFilter])

  const handleRead = async (m) => {
    if (!m.is_read) {
      await markAsRead(m.id)
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, is_read: true } : x))
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead(user.id)
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
    showMsg("모두 읽음 처리되었습니다.")
  }

  const handleDelete = async (id) => {
    await deleteMessage(id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
    showMsg("삭제되었습니다.")
  }

  const handleReply = async (toId) => {
    if (!replyMsg.trim()) return
    setSending(true)
    const fromName = user.user_metadata?.name || "익명"
    await sendCheer(user.id, fromName, toId, replyMsg.trim())
    setSending(false)
    setReplyTo(null)
    setReplyMsg("")
    showMsg("답장을 보냈습니다.")
  }

  const fmt = (ts) => {
    if (!ts) return ""
    const d = new Date(ts)
    const now = new Date()
    const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    if (d.toDateString() === now.toDateString()) return `오늘 ${t}`
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return `어제 ${t}`
    return `${d.getMonth() + 1}/${d.getDate()} ${t}`
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold">받은 쪽지</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            전체 {messages.length}건
            {unreadCount > 0 && <span className="text-primary font-semibold ml-1">· 안읽음 {unreadCount}</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 검색 */}
      <div className="flex gap-2 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            className="w-full h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-primary"
            placeholder="이름 또는 내용 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary text-gray-500"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {(keyword || dateFilter) && (
          <button
            onClick={() => { setKeyword(""); setDateFilter("") }}
            className="h-9 px-3 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition shrink-0"
          >
            초기화
          </button>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm">{messages.length === 0 ? "아직 도착한 쪽지가 없어요." : "검색 결과가 없어요."}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col gap-2">
              {paged.map((m) => {
                const isReplying = replyTo === m.id
                const initial = (m.from_name || "?")[0]
                return (
                  <div
                    key={m.id}
                    className="group flex items-start gap-3"
                    onMouseEnter={() => handleRead(m)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      m.is_read ? "bg-gray-100 text-gray-400" : "bg-primary/10 text-primary"
                    }`}>
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm ${m.is_read ? "text-gray-500" : "font-semibold text-gray-900"}`}>
                          {m.from_name}
                        </span>
                        {!m.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        <span className="text-[11px] text-gray-400">{fmt(m.created_at)}</span>
                      </div>

                      <div className={`relative inline-block max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2.5 ${
                        m.is_read ? "bg-gray-50" : "bg-primary/5"
                      }`}>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        <div className="absolute -right-1 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            onClick={() => { setReplyTo(isReplying ? null : m.id); setReplyMsg("") }}
                            className="w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                            title="답장"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H4V12"/><path d="M4 17L15 6"/><path d="M15 6h5v5"/></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                            title="삭제"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>

                      {isReplying && (
                        <div className="mt-1.5 flex gap-2 max-w-[90%]">
                          <input
                            className="flex-1 h-8 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary"
                            placeholder="답장을 입력하세요..."
                            value={replyMsg}
                            onChange={(e) => setReplyMsg(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleReply(m.from_id)}
                            maxLength={200}
                            autoFocus
                          />
                          <button
                            onClick={() => handleReply(m.from_id)}
                            disabled={sending || !replyMsg.trim()}
                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 shrink-0"
                          >
                            보내기
                          </button>
                          <button
                            onClick={() => { setReplyTo(null); setReplyMsg("") }}
                            className="h-8 px-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition shrink-0"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-4 mt-auto shrink-0 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition disabled:opacity-30"
                >
                  ‹ 이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                      i === safePage
                        ? "bg-primary text-white"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition disabled:opacity-30"
                >
                  다음 ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ───────── 쪽지 보내기 ───────── */
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
      setOnlineIds(new Set(Object.keys(state)))
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
                    className={`relative flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm transition ${
                      selectedId === c.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <div className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedId === c.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {c.name[0]}
                      {isOnline && (
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border ${
                          selectedId === c.id ? "bg-green-300 border-primary" : "bg-green-400 border-white"
                        }`} />
                      )}
                    </div>
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
