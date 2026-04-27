import { supabase } from "../lib/supabase"

export async function fetchTimetable(userId, isClass = false) {
  const { data, error } = await supabase
    .from("timetable")
    .select("*")
    .eq("user_id", userId)
    .eq("is_class", isClass)
    .order("day")
    .order("start_period")

  return { data, error }
}

export async function upsertTimetableEntry(entry) {
  const payload = { is_class: false, ...entry }
  const { data, error } = await supabase
    .from("timetable")
    .upsert(payload, { onConflict: "user_id,day,start_period,is_class" })
    .select()

  return { data, error }
}

export async function fetchTimetableByUserId(userId) {
  const { data, error } = await supabase
    .from("timetable")
    .select("*")
    .eq("user_id", userId)
    .eq("is_class", false)
    .order("day")
    .order("start_period")

  return { data, error }
}

export async function deleteTimetableEntry(id) {
  const { error } = await supabase
    .from("timetable")
    .delete()
    .eq("id", id)

  return { error }
}
