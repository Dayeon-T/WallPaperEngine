import { supabase } from "../lib/supabase"

export async function fetchSchoolEvents(atptCode, schoolCode) {
  const { data, error } = await supabase
    .from("school_events")
    .select("*")
    .eq("atpt_code", atptCode)
    .eq("school_code", schoolCode)
    .order("date", { ascending: true })
  return { data: data ?? [], error }
}

export async function addSchoolEvent({ atptCode, schoolCode, date, endDate, name, userId }) {
  const row = {
    atpt_code: atptCode,
    school_code: schoolCode,
    date,
    name,
    created_by: userId,
  }
  if (endDate && endDate !== date) row.end_date = endDate
  const { data, error } = await supabase
    .from("school_events")
    .insert(row)
    .select()
    .single()
  return { data, error }
}

export async function deleteSchoolEvent(id) {
  const { error } = await supabase
    .from("school_events")
    .delete()
    .eq("id", id)
  return { error }
}
