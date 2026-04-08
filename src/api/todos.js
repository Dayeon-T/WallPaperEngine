import { supabase } from "../lib/supabase"

export async function fetchTodos(userId) {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  return { data, error }
}

export async function addTodo(userId, content, position, dueDate = null) {
  const row = { user_id: userId, content, position }
  if (dueDate) row.due_date = dueDate
  const { data, error } = await supabase
    .from("todos")
    .insert(row)
    .select()

  return { data, error }
}

export async function updateTodoPosition(id, position) {
  const { error } = await supabase
    .from("todos")
    .update({ position })
    .eq("id", id)

  return { error }
}

export async function toggleTodo(id, isDone) {
  const updates = { is_done: isDone }
  if (isDone) {
    updates.completed_at = new Date().toISOString()
  } else {
    updates.completed_at = null
  }
  const { error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", id)

  return { error }
}

export async function toggleImportant(id, isImportant) {
  const { error } = await supabase
    .from("todos")
    .update({ is_important: isImportant })
    .eq("id", id)

  return { error }
}

export async function updateTodoContent(id, content) {
  const { error } = await supabase
    .from("todos")
    .update({ content })
    .eq("id", id)

  return { error }
}

export async function fetchWeeklyCompleted(userId) {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() + mondayOffset)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("todos")
    .select("completed_at")
    .eq("user_id", userId)
    .gte("completed_at", monday.toISOString())
    .lte("completed_at", sunday.toISOString())

  return { data, error }
}

export async function deleteTodo(id) {
  const { error } = await supabase
    .from("todos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  return { error }
}

export async function searchCompletedTodos(userId, { from, to, keyword } = {}) {
  let query = supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .eq("is_done", true)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  if (from) query = query.gte("completed_at", new Date(from + "T00:00:00").toISOString())
  if (to) query = query.lte("completed_at", new Date(to + "T23:59:59").toISOString())
  if (keyword) query = query.ilike("content", `%${keyword}%`)

  query = query.limit(100)

  const { data, error } = await query
  return { data: data ?? [], error }
}
