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
