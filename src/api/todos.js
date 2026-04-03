import { supabase } from "../lib/supabase"

export async function fetchTodos(userId) {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  return { data, error }
}

export async function addTodo(userId, content, position) {
  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: userId, content, position })
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
  const { error } = await supabase
    .from("todos")
    .update({ is_done: isDone })
    .eq("id", id)

  return { error }
}

export async function deleteTodo(id) {
  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)

  return { error }
}
