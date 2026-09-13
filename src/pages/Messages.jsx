import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import {
  sendCheer,
  fetchConversation,
  fetchConversationList,
  markAsRead,
  joinPresence,
  subscribeToCheer,
  searchByFriendCode,
  addFriendByCode,
  removeFriend,
  fetchFriends,
  uploadCheerImage,
  validateCheerImage,
} from "../api/cheers"
import { timeToMin, mergePeriodSchedule, getEnabledPeriods, findCurrentPeriod } from "../lib/periods"
import { fetchProfileRow, uploadAvatar } from "../api/settings"
import { fetchTimetableByUserId } from "../api/timetable"
import BackButton from "../components/BackButton"

const PRESET_MESSAGES = [
  "오늘도 파이팅!",
  "고생하셨어요 ☺",
  "항상 응원합니다!",
  "좋은 하루 보내세요!",
  "힘내세요, 선생님!",
  "멋져요! 👏",
]

function Avatar({ src, name, size = "w-10 h-10", textSize = "text-sm", className = "" }) {
  if (src) {
    return <img src={src} alt={name} className={`${size} rounded-full object-cover ${className}`} />
  }
  return (
    <div className={`${size} rounded-full flex items-center justify-center ${textSize} font-bold ${className}`}>
      {(name || "?")[0]}
    </div>
  )
}

function getNowStatus(entries, periodSchedule) {
  if (!entries || entries.length === 0) return null // 시간표 없으면 표시 안 함

  const now = new Date()
  const dayIndex = now.getDay()
  if (dayIndex === 0 || dayIndex === 6) return { text: "주말", emoji: "🏖️" }

  // 그 사람이 설정(교시 시간)에서 바꾼 값을 기본 교시표 위에 덮어쓴 뒤 활성 교시만 남긴다.
  const enabled = getEnabledPeriods(mergePeriodSchedule(periodSchedule))
  if (enabled.length === 0) return null

  const current = now.getHours() * 60 + now.getMinutes()
  const todayEntries = entries.filter((e) => e.day === dayIndex)

  // 오늘 수업이 없으면
  if (todayEntries.length === 0) return { text: "오늘 수업 없음", emoji: "🎉" }

  // '수업 전/끝'은 그 사람의 첫/마지막 수업이 아니라 일과 전체 기준으로 판단한다.
  // 첫 수업 기준으로 잡으면 3교시 시작인 날 1~2교시 공강이 전부 '수업 전'이 돼버린다.
  if (current < timeToMin(enabled[0].start)) return { text: "수업 전", emoji: "🌅" }
  if (current >= timeToMin(enabled[enabled.length - 1].end)) return { text: "수업 끝", emoji: "✅" }

  // 현재 교시 찾기
  const slot = findCurrentPeriod(enabled, current)

  // 교시 사이 = 쉬는 시간, 다음 교시 과목 예고
  if (!slot) {
    const next = enabled.find((p) => timeToMin(p.start) > current)
    if (next) {
      const nextEntry = todayEntries.find((e) => next.index >= e.start_period && next.index <= e.end_period)
      if (nextEntry && nextEntry.subject) {
        return { text: `쉬는 시간 → ${nextEntry.subject} ${next.label}`, emoji: "☕" }
      }
    }
    return { text: "쉬는 시간", emoji: "☕" }
  }

  // 점심시간
  if (slot.label === "점심시간") {
    return { text: "점심시간", emoji: "🍚" }
  }

  // 수업 중인지 공강인지 - 과목명 + 교시 표시
  const entry = todayEntries.find((e) => slot.index >= e.start_period && slot.index <= e.end_period)
  if (entry && entry.subject) {
    return { text: `${entry.subject} ${slot.label}`, emoji: "📚" }
  }
  return { text: `${slot.label} 공강`, emoji: "✨" }
}

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedName, setSelectedName] = useState("")
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [myAvatar, setMyAvatar] = useState(null)
  const [myFriendCode, setMyFriendCode] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [avatarMap, setAvatarMap] = useState({})
  const [uploading, setUploading] = useState(false)
  const [friends, setFriends] = useState([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [friendCodeInput, setFriendCodeInput] = useState("")
  const [friendSearchResult, setFriendSearchResult] = useState(null)
  const [friendSearching, setFriendSearching] = useState(false)
  const [friendMsg, setFriendMsg] = useState({ text: "", type: "" })
  const [codeCopied, setCodeCopied] = useState(false)
  const [statusMap, setStatusMap] = useState({})
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [pendingImage, setPendingImage] = useState(null) // { file, preview }
  const [sendError, setSendError] = useState("")
  const [lightbox, setLightbox] = useState(null) // 크게 보는 사진 URL
  const [dragOver, setDragOver] = useState(false)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  // 내 프로필 로드 (아바타 + 친구코드)
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.avatar_url) setMyAvatar(data.avatar_url)
      if (data?.friend_code) setMyFriendCode(data.friend_code)
    })()
  }, [user])

  // 친구 목록 로드 + 친구 시간표 상태도 로드
  const loadFriends = useCallback(async () => {
    if (!user) return
    const list = await fetchFriends(user.id)
    setFriends(list)
    const newMap = {}
    for (const f of list) {
      if (f.avatar_url) newMap[f.id] = f.avatar_url
    }
    setAvatarMap((prev) => ({ ...prev, ...newMap }))
    // 친구 시간표 상태 로드
    const newStatusMap = {}
    for (const f of list) {
      try {
        const { data: tt } = await fetchTimetableByUserId(f.id)
        if (tt) {
          const s = getNowStatus(tt, f.period_schedule)
          if (s) newStatusMap[f.id] = s
        }
      } catch { /* 권한 없으면 무시 */ }
    }
    if (Object.keys(newStatusMap).length > 0) {
      setStatusMap((prev) => ({ ...prev, ...newStatusMap }))
    }
  }, [user])

  useEffect(() => { loadFriends() }, [loadFriends])

  // 아바타 업로드
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const { data, error } = await uploadAvatar(user.id, file)
    if (!error && data) {
      setMyAvatar(data)
      window.dispatchEvent(new Event("avatar-change"))
    }
    setUploading(false)
  }

  // 대화 목록 로드
  const loadConversations = useCallback(async () => {
    if (!user) return
    const list = await fetchConversationList(user.id)
    setConversations(list)
    // 아바타 맵 구성
    const newMap = {}
    for (const c of list) {
      if (c.partnerAvatar) newMap[c.partnerId] = c.partnerAvatar
    }
    setAvatarMap((prev) => ({ ...prev, ...newMap }))
    // 상대방 시간표 상태 로드
    const newStatusMap = {}
    for (const c of list) {
      try {
        const { data: tt } = await fetchTimetableByUserId(c.partnerId)
        if (tt) {
          const s = getNowStatus(tt, c.partnerSchedule)
          if (s) newStatusMap[c.partnerId] = s
        }
      } catch { /* 권한 없으면 무시 */ }
    }
    setStatusMap((prev) => ({ ...prev, ...newStatusMap }))
  }, [user])

  useEffect(() => { loadConversations() }, [loadConversations])

  // 1분마다 상태 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      // statusMap의 키(partnerId)들에 대해 상태만 재계산
      setStatusMap((prev) => {
        const next = { ...prev }
        // 재계산은 loadConversations에서 하므로 여기서는 트리거만
        return next
      })
      loadConversations()
    }, 60000)
    return () => clearInterval(timer)
  }, [loadConversations])

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

  const clearPendingImage = useCallback(() => {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return null
    })
  }, [])

  // 크게 보기는 Esc로 닫는다
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => e.key === "Escape" && setLightbox(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  // 대화 선택 시 메시지 로드
  const openConversation = useCallback(async (partnerId, partnerName) => {
    if (!user) return
    setSelectedId(partnerId)
    setSelectedName(partnerName || "알 수 없음")
    setSelectedAvatar(avatarMap[partnerId] || null)
    // avatarMap에 없으면 DB에서 직접 조회
    if (!avatarMap[partnerId]) {
      try {
        const { supabase } = await import("../lib/supabase")
        const { data: p } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", partnerId)
          .single()
        if (p?.avatar_url) {
          setSelectedAvatar(p.avatar_url)
          setAvatarMap((prev) => ({ ...prev, [partnerId]: p.avatar_url }))
        }
      } catch {}
    }
    setSelectedStatus(statusMap[partnerId] || null)
    setShowNewChat(false)
    clearPendingImage()
    setSendError("")
    // 상대 시간표 상태 로드 (그 사람의 교시 시간 설정까지 반영)
    Promise.all([fetchTimetableByUserId(partnerId), fetchProfileRow(partnerId)])
      .then(([{ data: tt }, { data: prof }]) => {
        if (tt) {
          const s = getNowStatus(tt, prof?.period_schedule)
          setSelectedStatus(s)
          setStatusMap((prev) => ({ ...prev, [partnerId]: s }))
        }
      }).catch(() => {})
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
  }, [user, avatarMap, clearPendingImage])

  // 스크롤 맨 아래
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 첨부할 사진 고르기 (파일 선택 / 붙여넣기 / 드래그)
  const selectImage = (file) => {
    if (!file) return
    const invalid = validateCheerImage(file)
    if (invalid) {
      setSendError(invalid)
      return
    }
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file, preview: URL.createObjectURL(file) }
    })
    setSendError("")
  }

  // 메시지 보내기 (text가 있으면 빠른 메시지 — 첨부 사진은 같이 보내지 않음)
  const handleSend = async (text) => {
    const finalMsg = (text ?? inputMsg).trim()
    const image = text ? null : pendingImage
    if ((!finalMsg && !image) || !selectedId || sending) return
    setSending(true)
    setSendError("")

    let imageUrl = null
    if (image) {
      const { data, error } = await uploadCheerImage(user.id, image.file)
      if (error) {
        setSendError(error.message || "사진을 올리지 못했어요.")
        setSending(false)
        return
      }
      imageUrl = data
    }

    const fromName = user.user_metadata?.name || "익명"
    const { error } = await sendCheer(user.id, fromName, selectedId, finalMsg, imageUrl)
    if (error) {
      setSendError(error.message || "쪽지를 보내지 못했어요.")
      setSending(false)
      return
    }
    // 로컬에 즉시 반영
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from_id: user.id, from_name: fromName, to_id: selectedId, message: finalMsg, image_url: imageUrl, created_at: now, is_read: false },
    ])
    if (!text) setInputMsg("")
    if (image) clearPendingImage()
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

  // 새 대화 목록: 친구 코드로 추가한 친구 + 이미 대화 중인 상대만.
  // 같은 학교라는 이유만으로는 목록에 올리지 않습니다.
  const existingPartnerIds = new Set(conversations.map((c) => c.partnerId))
  const allContacts = showNewChat ? (() => {
    const map = new Map()
    for (const f of friends) map.set(f.id, { ...f, source: "friend" })
    for (const c of conversations) {
      if (map.has(c.partnerId)) continue
      map.set(c.partnerId, {
        id: c.partnerId,
        name: c.partnerName || "알 수 없음",
        avatar_url: c.partnerAvatar || avatarMap[c.partnerId] || null,
        source: "chat",
      })
    }
    let list = [...map.values()]
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter((c) => (c.name || "").toLowerCase().includes(kw))
    }
    return list
  })() : []

  // 친구 코드로 검색
  const handleFriendSearch = async () => {
    const code = friendCodeInput.trim().toUpperCase()
    if (!code || code.length < 4) {
      setFriendMsg({ text: "코드를 정확히 입력해주세요.", type: "error" })
      return
    }
    if (code === myFriendCode) {
      setFriendMsg({ text: "본인의 코드는 추가할 수 없어요.", type: "error" })
      return
    }
    setFriendSearching(true)
    setFriendSearchResult(null)
    const { data, error } = await searchByFriendCode(code)
    setFriendSearching(false)
    if (error || !data) {
      setFriendMsg({ text: "해당 코드의 선생님을 찾을 수 없어요.", type: "error" })
    } else if (data.id === user.id) {
      setFriendMsg({ text: "본인의 코드입니다.", type: "error" })
    } else {
      setFriendSearchResult(data)
      setFriendMsg({ text: "", type: "" })
    }
  }

  const handleAddFriend = async () => {
    const { error } = await addFriendByCode(friendCodeInput)
    if (error) {
      setFriendMsg({ text: error.message || "추가에 실패했어요.", type: "error" })
    } else {
      setFriendMsg({ text: "친구가 추가되었습니다!", type: "success" })
      setFriendSearchResult(null)
      setFriendCodeInput("")
      loadFriends()
    }
  }

  const handleRemoveFriend = async (friendId) => {
    await removeFriend(user.id, friendId)
    loadFriends()
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myFriendCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (!user) return null

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-[1.5vw]">
      <div />
      <div className="col-span-3 flex bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* 왼쪽: 대화 목록 */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
          {/* 내 프로필 */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <BackButton iconOnly className="-ml-1" />
                <a href="/" className="text-lg font-black">PLANSCHOOL</a>
              </div>
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
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative group shrink-0"
                title="프로필 사진 변경"
              >
                {myAvatar ? (
                  <img src={myAvatar} alt="내 프로필" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    {(user.user_metadata?.name || "?")[0]}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-white/60 flex items-center justify-center">
                    <span className="text-[10px] text-gray-500">...</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user.user_metadata?.name || "나"}</p>
                {myFriendCode && (
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition"
                    title="클릭하여 복사"
                  >
                    <span className="font-mono">{myFriendCode}</span>
                    <span>{codeCopied ? "복사됨!" : "복사"}</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => { setShowAddFriend(!showAddFriend); setFriendSearchResult(null); setFriendCodeInput(""); setFriendMsg({ text: "", type: "" }) }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                  showAddFriend ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-100"
                }`}
                title="친구 추가"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </button>
            </div>

            {/* 친구 추가 패널 */}
            {showAddFriend && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-2">친구 코드로 추가</p>
                <div className="flex gap-1.5">
                  <input
                    className="flex-1 h-8 rounded-lg border border-gray-200 px-3 text-sm font-mono uppercase outline-none focus:border-primary text-center tracking-widest"
                    placeholder="코드 입력"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleFriendSearch()}
                    maxLength={6}
                  />
                  <button
                    onClick={handleFriendSearch}
                    disabled={friendSearching || friendCodeInput.trim().length < 4}
                    className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 shrink-0"
                  >
                    {friendSearching ? "..." : "검색"}
                  </button>
                </div>
                {friendMsg.text && (
                  <p className={`text-[11px] mt-1.5 ${friendMsg.type === "error" ? "text-red-500" : "text-green-500"}`}>
                    {friendMsg.text}
                  </p>
                )}
                {friendSearchResult && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-white rounded-lg">
                    <Avatar src={friendSearchResult.avatar_url} name={friendSearchResult.name} size="w-8 h-8" textSize="text-xs" className="bg-primary/10 text-primary" />
                    <span className="text-sm font-medium flex-1 truncate">{friendSearchResult.name}</span>
                    <button
                      onClick={handleAddFriend}
                      className="h-7 px-2.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:opacity-90 transition shrink-0"
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>
            )}

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
                {allContacts.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">
                    {friends.length === 0 && conversations.length === 0
                      ? "친구 코드로 선생님을 추가해보세요."
                      : "검색 결과가 없어요."}
                  </p>
                ) : (
                  allContacts.map((c) => {
                    const isOnline = onlineIds.has(c.id)
                    const hasConvo = existingPartnerIds.has(c.id)
                    const isFriend = friends.some((f) => f.id === c.id)
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                        <button
                          onClick={() => startNewChat(c)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className="relative">
                            <Avatar src={c.avatar_url || avatarMap[c.id]} name={c.name} className="bg-primary/10 text-primary" />
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            {statusMap[c.id] ? (
                              <p className="text-[11px] text-gray-400 truncate">
                                {statusMap[c.id].emoji} {statusMap[c.id].text}
                                <span className="text-gray-300"> · {c.source === "friend" ? "친구" : "대화 중"}</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400">
                                {c.source === "friend" ? "친구" : "대화 중"}
                                {c.source === "friend" && hasConvo ? " · 대화 있음" : ""}
                              </p>
                            )}
                          </div>
                        </button>
                        {isFriend && (
                          <button
                            onClick={() => handleRemoveFriend(c.id)}
                            className="text-[11px] text-gray-300 hover:text-red-400 transition shrink-0 px-1"
                            title="친구 삭제"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/>
                              <circle cx="8.5" cy="7" r="4"/>
                              <line x1="18" y1="11" x2="23" y2="11"/>
                            </svg>
                          </button>
                        )}
                      </div>
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
                      <Avatar
                        src={c.partnerAvatar || avatarMap[c.partnerId]}
                        name={c.partnerName}
                        className={isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}
                      />
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
                      {statusMap[c.partnerId] && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {statusMap[c.partnerId].emoji} {statusMap[c.partnerId].text}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-400 truncate pr-2">
                          {isMine ? "나: " : ""}
                          {lastMsg.image_url ? `📷 ${lastMsg.message || "사진"}` : lastMsg.message}
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

        {/* 오른쪽: 채팅 영역 (사진을 끌어다 놓으면 첨부됩니다) */}
        <div
          className="relative flex-1 flex flex-col min-w-0"
          onDragOver={(e) => {
            if (!selectedId || sending) return
            if ([...(e.dataTransfer?.types || [])].includes("Files")) {
              e.preventDefault()
              setDragOver(true)
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
          }}
          onDrop={(e) => {
            if (!selectedId) return
            e.preventDefault()
            setDragOver(false)
            selectImage(e.dataTransfer?.files?.[0])
          }}
        >
          {dragOver && (
            <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-primary/60 bg-white/70 flex items-center justify-center text-sm font-semibold text-primary">
              여기에 놓으면 사진이 첨부됩니다
            </div>
          )}
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
                  <Avatar src={selectedAvatar} name={selectedName} size="w-9 h-9" className="bg-primary/10 text-primary" />
                  {onlineIds.has(selectedId) && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedName}</p>
                  <p className="text-[11px] text-gray-400">
                    {selectedStatus && (
                      <span className="mr-1.5">{selectedStatus.emoji} {selectedStatus.text}</span>
                    )}
                    {onlineIds.has(selectedId) && (
                      <span className="text-green-500">· 접속 중</span>
                    )}
                  </p>
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
                    const isFirstOfGroup = !prevMsg || prevMsg.from_id !== m.from_id || showDate
                    const showAvatar = !isMine && isFirstOfGroup
                    const showMyAvatar = isMine && isFirstOfGroup
                    // 시간 표시: 같은 사람이 연속으로 보낸 경우 마지막만
                    const nextMsg = messages[i + 1]
                    const showTime = !nextMsg ||
                      nextMsg.from_id !== m.from_id ||
                      getDateKey(m.created_at) !== getDateKey(nextMsg.created_at) ||
                      fmtTime(m.created_at) !== fmtTime(nextMsg.created_at)

                    const isLast = i === messages.length - 1
                    const bubbleCls = `px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMine
                        ? "bg-primary text-white rounded-2xl rounded-br-sm"
                        : "bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm"
                    }`

                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="bg-gray-200/60 text-gray-500 text-[11px] px-3 py-1 rounded-full">
                              {fmtDate(m.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${(showAvatar || showMyAvatar) ? "mt-3" : "mt-0.5"}`}>
                          {/* 상대방 아바타 */}
                          {!isMine && (
                            <div className="w-8 mr-2 shrink-0">
                              {showAvatar && (
                                <Avatar src={selectedAvatar} name={selectedName} size="w-8 h-8" textSize="text-xs" className="bg-primary/10 text-primary" />
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[65%]`}>
                            {showAvatar && !isMine && (
                              <span className="text-xs text-gray-500 mb-1 ml-1">{m.from_name}</span>
                            )}
                            <div className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
                              {m.image_url ? (
                                <div className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                                  <button
                                    type="button"
                                    onClick={() => setLightbox(m.image_url)}
                                    className="block rounded-2xl overflow-hidden bg-gray-200/60 shadow-sm hover:opacity-95 transition"
                                    title="크게 보기"
                                  >
                                    <img
                                      src={m.image_url}
                                      alt="사진"
                                      loading="lazy"
                                      className="block max-w-[240px] max-h-[240px] w-auto h-auto"
                                      // 마지막 사진이 뒤늦게 뜨면 스크롤이 위에 걸려 있으므로 다시 내려준다
                                      onLoad={() => isLast && chatEndRef.current?.scrollIntoView()}
                                    />
                                  </button>
                                  {m.message && <div className={bubbleCls}>{m.message}</div>}
                                </div>
                              ) : (
                                <div className={bubbleCls}>{m.message}</div>
                              )}
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
                          {/* 내 아바타 */}
                          {isMine && (
                            <div className="w-8 ml-2 shrink-0">
                              {showMyAvatar && (
                                <Avatar src={myAvatar} name={user?.user_metadata?.name || "나"} size="w-8 h-8" textSize="text-xs" className="bg-primary/10 text-primary" />
                              )}
                            </div>
                          )}
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
                {/* 첨부 사진 미리보기 */}
                {pendingImage && (
                  <div className="mb-2 flex items-start">
                    <div className="relative">
                      <img
                        src={pendingImage.preview}
                        alt="첨부할 사진"
                        className="block h-20 max-w-[200px] w-auto rounded-lg border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearPendingImage}
                        disabled={sending}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-xs leading-none flex items-center justify-center shadow hover:bg-red-500 transition disabled:opacity-40"
                        title="첨부 취소"
                      >
                        ×
                      </button>
                      {sending && (
                        <div className="absolute inset-0 rounded-lg bg-white/60 flex items-center justify-center text-[11px] text-gray-600">
                          올리는 중...
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {sendError && (
                  <p className="text-[11px] text-red-500 mb-1.5">{sendError}</p>
                )}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending}
                    className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-primary flex items-center justify-center transition disabled:opacity-40 shrink-0"
                    title="사진 보내기"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      selectImage(e.target.files?.[0])
                      e.target.value = "" // 같은 파일을 다시 골라도 onChange가 뜨도록
                    }}
                  />
                  <textarea
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onPaste={(e) => {
                      // 캡처한 이미지를 붙여넣으면 바로 첨부
                      const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith("image/"))
                      if (item) {
                        e.preventDefault()
                        selectImage(item.getAsFile())
                      }
                    }}
                    onKeyDown={(e) => {
                      // 한글 조합 중 Enter는 무시 (마지막 글자 중복 방지)
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={pendingImage ? "사진과 함께 보낼 말 (선택)" : "메시지를 입력하세요..."}
                    maxLength={200}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary max-h-24"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={(!inputMsg.trim() && !pendingImage) || sending}
                    className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 shrink-0"
                    title="보내기"
                  >
                    {sending ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 사진 크게 보기 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="사진 크게 보기"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightbox}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-lg bg-white/15 text-white text-xs font-semibold flex items-center hover:bg-white/25 transition"
            >
              원본 열기
            </a>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="w-9 h-9 rounded-lg bg-white/15 text-white text-lg leading-none flex items-center justify-center hover:bg-white/25 transition"
              title="닫기 (Esc)"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
