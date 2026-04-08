import { supabase } from "../lib/supabase"

export async function updateProfile(metadata) {
  const { data, error } = await supabase.auth.updateUser({ data: metadata })
  return { data, error }
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}

export async function fetchProfileRow(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("period_schedule, quick_links, bg_prefs, widget_style, dday_events, layout_mode, today_highlight, folder_names, weekly_timetable")
    .eq("id", userId)
    .single()
  return { data, error }
}

export async function upsertProfileRow(userId, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...fields, updated_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export async function deleteOwnAccount() {
  const { error } = await supabase.rpc("delete_own_account")
  return { error }
}
