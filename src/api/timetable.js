import { supabase } from "../lib/supabase"

export async function fetchTimetable(userId) {
  const { data, error } = await supabase
    .from("timetable")
    .select("*")
    .eq("user_id", userId)
    .order("day")
    .order("start_period")

  return { data, error }
}

export async function upsertTimetableEntry(entry) {
  const { data, error } = await supabase
    .from("timetable")
    .upsert(entry, { onConflict: "user_id,day,start_period" })
    .select()

  return { data, error }
}

export async function fetchTimetableByUserId(userId) {
  const { data, error } = await supabase
    .from("timetable")
    .select("*")
    .eq("user_id", userId)
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
