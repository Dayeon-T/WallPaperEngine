import { supabase } from "../lib/supabase"

export async function fetchColleagues(atptCode, schoolCode, currentUserId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("atpt_code", atptCode)
    .eq("school_code", schoolCode)
    .neq("id", currentUserId)

  return { data, error }
}

export async function sendCheer(fromId, fromName, toId, message) {
  const { error } = await supabase
    .from("cheers")
    .insert({ from_id: fromId, from_name: fromName, to_id: toId, message })

  return { error }
}

export async function fetchInbox(userId) {
  const { data, error } = await supabase
    .from("cheers")
    .select("*")
    .eq("to_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  return { data: data ?? [], error }
}

/* 나와 상대방 사이의 모든 메시지 (보낸 것 + 받은 것) */
export async function fetchConversation(myId, otherId) {
  const { data, error } = await supabase
    .from("cheers")
    .select("*")
    .or(
      `and(from_id.eq.${myId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${myId})`
    )
    .order("created_at", { ascending: true })
    .limit(200)

  return { data: data ?? [], error }
}

/* 대화 상대 목록: 나에게 보냈거나 내가 보낸 모든 메시지에서 상대 추출 + 최신 메시지 */
export async function fetchConversationList(userId) {
  // 받은 메시지
  const { data: incoming } = await supabase
    .from("cheers")
    .select("*")
    .eq("to_id", userId)
    .order("created_at", { ascending: false })

  // 보낸 메시지
  const { data: outgoing } = await supabase
    .from("cheers")
    .select("*")
    .eq("from_id", userId)
    .order("created_at", { ascending: false })

  const all = [...(incoming || []), ...(outgoing || [])]

  // 상대별로 그룹핑
  const map = {}
  for (const m of all) {
    const otherId = m.from_id === userId ? m.to_id : m.from_id
    const otherName = m.from_id === userId ? null : m.from_name
    if (!map[otherId]) {
      map[otherId] = { partnerId: otherId, partnerName: otherName, lastMessage: m, unread: 0 }
    }
    // 가장 최신 메시지
    if (new Date(m.created_at) > new Date(map[otherId].lastMessage.created_at)) {
      map[otherId].lastMessage = m
    }
    // 이름 채우기 (받은 메시지에서)
    if (otherName && !map[otherId].partnerName) {
      map[otherId].partnerName = otherName
    }
    // 안읽은 수 (내가 받은 것 중)
    if (m.to_id === userId && !m.is_read) {
      map[otherId].unread++
    }
  }

  // 이름이 없는 상대방은 profiles 테이블에서 조회
  const unknownIds = Object.values(map)
    .filter((c) => !c.partnerName)
    .map((c) => c.partnerId)

  if (unknownIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", unknownIds)

    for (const p of (profiles || [])) {
      if (map[p.id]) map[p.id].partnerName = p.name
    }
  }

  // 최신 메시지 순 정렬
  return Object.values(map).sort(
    (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
  )
}

export async function markAsRead(id) {
  const { error } = await supabase
    .from("cheers")
    .update({ is_read: true })
    .eq("id", id)

  return { error }
}

export async function markAllAsRead(userId) {
  const { error } = await supabase
    .from("cheers")
    .update({ is_read: true })
    .eq("to_id", userId)
    .or("is_read.eq.false,is_read.is.null")

  return { error }
}

export async function deleteMessage(id) {
  const { error } = await supabase
    .from("cheers")
    .delete()
    .eq("id", id)

  return { error }
}

export function joinPresence(user) {
  const meta = user.user_metadata || {}
  const channelKey = meta.atpt_code && meta.school_code
    ? `presence:${meta.atpt_code}:${meta.school_code}`
    : null
  if (!channelKey) return () => {}

  const channel = supabase.channel(channelKey, {
    config: { presence: { key: user.id } },
  })

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState()
      window.dispatchEvent(new CustomEvent("presence-sync", { detail: state }))
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          name: meta.name || "익명",
          online_at: new Date().toISOString(),
        })
      }
    })

  return () => {
    channel.untrack()
    supabase.removeChannel(channel)
  }
}

export function subscribeToCheer(userId, onCheer) {
  const channel = supabase
    .channel("cheers:" + userId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "cheers",
        filter: `to_id=eq.${userId}`,
      },
      (payload) => onCheer(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
