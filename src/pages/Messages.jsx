import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import {
  fetchColleagues,
  sendCheer,
  fetchConversation,
  fetchConversationList,
  markAsRead,
  joinPresence,
  subscribeToCheer,
} from "../api/cheers"

const PRESET_MESSAGES = [
  "오늘도 파이팅!",
  "고생하셨어요 ☺",
  "항상 응원합니다!",
  "좋은 하루 보내세요!",
  "힘내세요, 선생님!",
  "멋져요! 👏",
]

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [colleagues, setColleagues] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedName, setSelectedName] = useState("")
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [onlineIds, setOnlineIds] = useState(new Set())
  const chatEndRef = useRef(null)

  // 대화 목록 로드
  const loadConversations = useCallback(async () => {
    if (!user) return
    const list = await fetchConversationList(user.id)
    setConversations(list)
  }, [user])

  useEffect(() => { loadConversations() }, [loadConversations])

  // 동료 목록 (새 대화용)
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    if (!meta.atpt_code || !meta.school_code) return
    ;(async () => {
      const { data } = await fetchColleagues(meta.atpt_code, meta.school_code, user.id)
      if (data) setColleagues(data)
    })()
  }, [user])

  // Presence
  useEffect(() => {
    if (!user) return
    const leave = joinPresence(user)
    return leave
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      const state = e.detail || {}
      setOnlineIds(new Set(Object.keys(state)))
    }
    window.addEventListener("presence-sync", handler)
    return () => window.removeEventListener("presence-sync", handler)
  }, [])

  // 실시간 수신
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToCheer(
      user.id,
      (newMsg) => {
        loadConversations()
        if (selectedId && newMsg.from_id === selectedId) {
          setMessages((prev) => [...prev, newMsg])
          markAsRead(newMsg.id)
        }
      },
      (readMsg) => {
        // 상대가 내 메시지를 읽었을 때
        setMessages((prev) =>
          prev.map((m) => m.id === readMsg.id ? { ...m, is_read: true } : m)
        )
      },
    )
    return unsub
  }, [user, selectedId, loadConversations])

  // 대화 선택 시 메시지 로드
  const openConversation = useCallback(async (partnerId, partnerName) => {
    if (!user) return
    setSelectedId(partnerId)
    setSelectedName(partnerName || "알 수 없음")
    setShowNewChat(false)
    const { data } = await fetchConversation(user.id, partnerId)
    setMessages(data || [])
    // 안읽은 메시지 읽음 처리
    for (const m of (data || [])) {
      if (m.to_id === user.id && !m.is_read) {
        markAsRead(m.id)
      }
    }
    // 대화 목록에서 unread 카운트 초기화
    setConversations((prev) =>
      prev.map((c) => c.partnerId === partnerId ? { ...c, unread: 0 } : c)
    )
  }, [user])

  // 스크롤 맨 아래
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 메시지 보내기
  const handleSend = async (text) => {
    const finalMsg = text || inputMsg.trim()
    if (!finalMsg || !selectedId) return
    setSending(true)
    const fromName = user.user_metadata?.name || "익명"
    await sendCheer(user.id, fromName, selectedId, finalMsg)
    // 로컬에 즉시 반영
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from_id: user.id, from_name: fromName, to_id: selectedId, message: finalMsg, created_at: now, is_read: false },
    ])
    setInputMsg("")
    setSending(false)
    loadConversations()
  }

  // 새 대화 시작
  const startNewChat = (colleague) => {
    setShowNewChat(false)
    openConversation(colleague.id, colleague.name)
  }

  // 날짜 포맷
  const fmtTime = (ts) => {
    const d = new Date(ts)
    const h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, "0")
    const ampm = h < 12 ? "오전" : "오후"
    return `${ampm} ${h % 12 || 12}:${m}`
  }

  const fmtDate = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return "오늘"
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return "어제"
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  }

  const fmtPreview = (ts) => {
    if (!ts) return ""
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return fmtTime(ts)
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return "어제"
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  // 날짜별 그룹핑 헬퍼
  const getDateKey = (ts) => new Date(ts).toDateString()

  // 검색 필터
  const filteredConvos = search.trim()
    ? conversations.filter((c) =>
        (c.partnerName || "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : conversations

  // 새 대화 목록 (기존 대화가 없는 동료만)
  const existingPartnerIds = new Set(conversations.map((c) => c.partnerId))
  const newChatColleagues = showNewChat
    ? colleagues.filter((c) => {
        if (search.trim()) return c.name.toLowerCase().includes(search.trim().toLowerCase())
        return true
      })
    : []

  if (!user) return null

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-[1.5vw]">
      <div />
      <div className="col-span-3 flex bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* 왼쪽: 대화 목록 */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
          {/* 헤더 */}
          <div className="p-4 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <a href="/" className="text-lg font-black">DASHBOARD</a>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
                title="새 대화"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  <line x1="12" y1="8" x2="12" y2="14"/>
                  <line x1="9" y1="11" x2="15" y2="11"/>
                </svg>
              </button>
            </div>
            {/* 검색 */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                className="w-full h-9 rounded-lg bg-gray-50 pl-8 pr-3 text-sm outline-none focus:bg-gray-100 transition"
                placeholder="이름 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 대화 목록 or 새 대화 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {showNewChat ? (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-400">새 대화 시작</p>
                {newChatColleagues.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">
                    {colleagues.length === 0 ? "같은 학교 선생님이 없습니다." : "검색 결과가 없어요."}
                  </p>
                ) : (
                  newChatColleagues.map((c) => {
                    const isOnline = onlineIds.has(c.id)
                    const hasConvo = existingPartnerIds.has(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => startNewChat(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {c.name[0]}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          {hasConvo && <p className="text-xs text-gray-400">기존 대화 있음</p>}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                <span className="text-3xl mb-2">💬</span>
                <p className="text-sm text-center">
                  {conversations.length === 0 ? "아직 대화가 없어요.\n새 대화를 시작해보세요!" : "검색 결과가 없어요."}
                </p>
              </div>
            ) : (
              filteredConvos.map((c) => {
                const isActive = selectedId === c.partnerId
                const isOnline = onlineIds.has(c.partnerId)
                const lastMsg = c.lastMessage
                const isMine = lastMsg.from_id === user.id
                return (
                  <button
                    key={c.partnerId}
                    onClick={() => openConversation(c.partnerId, c.partnerName)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition text-left ${
                      isActive ? "bg-primary/5" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {(c.partnerName || "?")[0]}
                      </div>
                      {isOnline && (
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 ${
                          isActive ? "border-primary/5" : "border-white"
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${c.unread > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                          {c.partnerName || "알 수 없음"}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0">{fmtPreview(lastMsg.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-400 truncate pr-2">
                          {isMine ? "나: " : ""}{lastMsg.message}
                        </p>
                        {c.unread > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 오른쪽: 채팅 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200 mb-3">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p className="text-sm">대화를 선택하세요</p>
              <p className="text-xs mt-1">왼쪽 목록에서 선생님을 선택하거나 새 대화를 시작하세요</p>
            </div>
          ) : (
            <>
              {/* 채팅 헤더 */}
              <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {(selectedName || "?")[0]}
                  </div>
                  {onlineIds.has(selectedId) && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedName}</p>
                  {onlineIds.has(selectedId) && (
                    <p className="text-[11px] text-green-500">접속 중</p>
                  )}
                </div>
              </div>

              {/* 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-1 min-h-0 bg-gray-50/50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p className="text-sm">첫 메시지를 보내보세요!</p>
                    <div className="flex flex-wrap gap-2 mt-4 max-w-md justify-center">
                      {PRESET_MESSAGES.map((pm) => (
                        <button
                          key={pm}
                          onClick={() => handleSend(pm)}
                          className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs text-gray-500 hover:border-primary hover:text-primary transition"
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isMine = m.from_id === user.id
                    const prevMsg = messages[i - 1]
                    const showDate = !prevMsg || getDateKey(m.created_at) !== getDateKey(prevMsg.created_at)
                    const showAvatar = !isMine && (!prevMsg || prevMsg.from_id !== m.from_id || showDate)
                    // 시간 표시: 같은 사람이 연속으로 보낸 경우 마지막만
                    const nextMsg = messages[i + 1]
                    const showTime = !nextMsg ||
                      nextMsg.from_id !== m.from_id ||
                      getDateKey(m.created_at) !== getDateKey(nextMsg.created_at) ||
                      fmtTime(m.created_at) !== fmtTime(nextMsg.created_at)

                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="bg-gray-200/60 text-gray-500 text-[11px] px-3 py-1 rounded-full">
                              {fmtDate(m.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                          {/* 상대방 아바타 */}
                          {!isMine && (
                            <div className="w-8 mr-2 shrink-0">
                              {showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                  {(selectedName || "?")[0]}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[65%]`}>
                            {showAvatar && !isMine && (
                              <span className="text-xs text-gray-500 mb-1 ml-1">{m.from_name}</span>
                            )}
                            <div className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
                              <div className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isMine
                                  ? "bg-primary text-white rounded-2xl rounded-br-sm"
                                  : "bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm"
                              }`}>
                                {m.message}
                              </div>
                              <div className="flex flex-col items-end gap-0.5 shrink-0 pb-0.5">
                                {isMine && !m.is_read && (
                                  <span className="text-[10px] font-bold text-primary leading-none">1</span>
                                )}
                                {showTime && (
                                  <span className="text-[10px] text-gray-400 leading-none">
                                    {fmtTime(m.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 입력 영역 */}
              <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
                {/* 빠른 메시지 */}
                <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                  {PRESET_MESSAGES.map((pm) => (
                    <button
                      key={pm}
                      onClick={() => handleSend(pm)}
                      disabled={sending}
                      className="px-2.5 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500 hover:bg-primary/10 hover:text-primary transition shrink-0 disabled:opacity-50"
                    >
                      {pm}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    maxLength={200}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary max-h-24"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputMsg.trim() || sending}
                    className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 shrink-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
