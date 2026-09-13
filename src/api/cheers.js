import { supabase } from "../lib/supabase"

export async function sendCheer(fromId, fromName, toId, message, imageUrl = null) {
  const { error } = await supabase
    .from("cheers")
    .insert({
      from_id: fromId,
      from_name: fromName,
      to_id: toId,
      message: message || "",
      image_url: imageUrl || null,
    })

  return { error }
}

/* ───── 쪽지 사진 ───── */

export const CHEER_IMAGE_MAX_BYTES = 10 * 1024 * 1024
const CHEER_IMAGE_MAX_EDGE = 1600
// svg는 스크립트를 품을 수 있어 받지 않습니다.
const CHEER_IMAGE_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
}

export function validateCheerImage(file) {
  if (!file) return "사진을 선택해주세요."
  if (!CHEER_IMAGE_EXT[file.type]) return "jpg, png, gif, webp 사진만 보낼 수 있어요."
  if (file.size > CHEER_IMAGE_MAX_BYTES) return "10MB 이하의 사진만 보낼 수 있어요."
  return null
}

/* 휴대폰 사진은 한 장에 수 MB라 저장 용량을 금방 채웁니다.
   긴 변이 1600px을 넘거나 1.5MB보다 크면 올리기 전에 브라우저에서 줄입니다. */
async function shrinkCheerImage(file) {
  if (file.type === "image/gif") return file // 움짤은 줄이면 멈춰버린다
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const { width, height } = bitmap
    const scale = Math.min(1, CHEER_IMAGE_MAX_EDGE / Math.max(width, height))
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    // png는 투명 배경을 지키고, 나머지는 jpeg로 압축한다
    const type = file.type === "image/png" ? "image/png" : "image/jpeg"
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + CHEER_IMAGE_EXT[type], { type })
  } catch {
    return file
  }
}

/* 사진을 올리고 공개 URL을 돌려줍니다. 경로는 "{보낸 사람 id}/{랜덤 uuid}.확장자". */
export async function uploadCheerImage(userId, file) {
  const invalid = validateCheerImage(file)
  if (invalid) return { error: new Error(invalid) }

  const upload = await shrinkCheerImage(file)
  const path = `${userId}/${crypto.randomUUID()}.${CHEER_IMAGE_EXT[upload.type] || "jpg"}`

  const { error } = await supabase.storage
    .from("cheer-images")
    .upload(path, upload, { contentType: upload.type, cacheControl: "31536000" })

  if (error) return { error }

  const { data } = supabase.storage.from("cheer-images").getPublicUrl(path)
  return { data: data.publicUrl, error: null }
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

  // 모든 상대방의 이름과 아바타를 profiles 테이블에서 조회
  const partnerIds = Object.keys(map)
  if (partnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, period_schedule")
      .in("id", partnerIds)

    for (const p of (profiles || [])) {
      if (map[p.id]) {
        if (!map[p.id].partnerName) map[p.id].partnerName = p.name
        map[p.id].partnerAvatar = p.avatar_url || null
        map[p.id].partnerSchedule = p.period_schedule || null
      }
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

/* ───── 친구 관련 ───── */

export async function fetchMyFriendCode(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("friend_code")
    .eq("id", userId)
    .single()
  return data?.friend_code || null
}

/* 검색과 추가 모두 RPC로만 합니다.
   같은 학교라는 이유로 서로 노출되지 않도록 profiles 조회를
   "본인 / 친구 / 이미 대화한 상대"로 제한했기 때문에,
   아직 친구가 아닌 사람은 이 함수(security definer)로만 찾을 수 있습니다. */
export async function searchByFriendCode(code) {
  const { data, error } = await supabase.rpc("find_by_friend_code", {
    p_code: code.toUpperCase().trim(),
  })
  return { data: data?.[0] || null, error }
}

export async function addFriendByCode(code) {
  const { data, error } = await supabase.rpc("add_friend_by_code", {
    p_code: code.toUpperCase().trim(),
  })
  return { data: data?.[0] || null, error }
}

export async function removeFriend(userId, friendId) {
  const { error } = await supabase
    .from("friends")
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
  return { error }
}

export async function fetchFriends(userId) {
  // 내가 추가한 친구
  const { data: sent } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", userId)

  // 나를 추가한 친구
  const { data: received } = await supabase
    .from("friends")
    .select("user_id")
    .eq("friend_id", userId)

  const friendIds = [
    ...new Set([
      ...(sent || []).map((r) => r.friend_id),
      ...(received || []).map((r) => r.user_id),
    ]),
  ]

  if (friendIds.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, period_schedule")
    .in("id", friendIds)

  return profiles || []
}

// 같은 사용자를 여러 화면이 동시에 구독할 수 있다.
// 채널 이름이 겹치면 supabase-js가 이미 subscribe()된 채널을 그대로 돌려주고,
// 거기에 .on()을 붙이는 순간 예외가 나서 앱 전체가 죽는다. 매번 다른 이름을 쓴다.
let cheerChannelSeq = 0

export function subscribeToCheer(userId, onCheer, onRead) {
  cheerChannelSeq += 1
  const channel = supabase
    .channel(`cheers:${userId}:${cheerChannelSeq}`)
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
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "cheers",
        filter: `from_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new.is_read && onRead) onRead(payload.new)
      },
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
