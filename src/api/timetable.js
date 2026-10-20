import { supabase } from "../lib/supabase"
import { expandEntries, hasRangeEntries } from "../lib/periods"

// upsert에 실을 수 있는 컬럼만 남긴다. 배열 upsert는 모든 row의 키가 같아야 하므로
// id·created_at처럼 row마다 있을 수도 없을 수도 있는 값은 뺀다.
function toPayload(entry) {
  return {
    user_id: entry.user_id,
    day: entry.day,
    start_period: entry.start_period,
    end_period: entry.start_period,
    subject: entry.subject ?? "",
    room: entry.room ?? "",
    color: entry.color ?? "#EBEBEB",
    is_class: entry.is_class ?? false,
  }
}

export async function fetchTimetable(userId, isClass = false) {
  const { data, error } = await supabase
    .from("timetable")
    .select("*")
    .eq("user_id", userId)
    .eq("is_class", isClass)
    .order("day")
    .order("start_period")

  // needsMigration: 범위로 저장된 예전 row가 있어 교시별 row로 다시 써야 한다.
  return { data: data ? expandEntries(data) : data, error, needsMigration: hasRangeEntries(data) }
}

export async function upsertTimetableEntry(entry) {
  return upsertTimetableEntries([entry])
}

// 여러 칸을 한 번에 저장한다 (블록타임 = 같은 수업을 두 칸에 쓰는 것).
export async function upsertTimetableEntries(entries) {
  if (entries.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from("timetable")
    .upsert(entries.map(toPayload), { onConflict: "user_id,day,start_period,is_class" })
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

  // 친구 시간표는 고칠 권한이 없으므로 펼쳐서 읽기만 한다.
  return { data: data ? expandEntries(data) : data, error }
}

export async function deleteTimetableEntry(id) {
  return deleteTimetableEntries([id])
}

export async function deleteTimetableEntries(ids) {
  const list = ids.filter(Boolean)
  if (list.length === 0) return { error: null }
  const { error } = await supabase
    .from("timetable")
    .delete()
    .in("id", list)

  return { error }
}
