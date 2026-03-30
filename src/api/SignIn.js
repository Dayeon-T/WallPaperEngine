import { supabase } from "../lib/supabase"

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signUp(email, password, profile) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile,
    },
  })
  return { data, error }
}

export async function signOut() {
  return await supabase.auth.signOut()
}
