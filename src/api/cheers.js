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
