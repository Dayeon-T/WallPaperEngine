import { supabase } from "../lib/supabase"

function mapAuthError(error) {
  const message = error?.message ?? ""

  if (/Email not confirmed/i.test(message)) {
    return "이메일 인증이 필요합니다. 받은 편지함에서 인증 링크를 먼저 눌러주세요."
  }
  if (/Invalid login credentials/i.test(message)) {
    return "이메일 또는 비밀번호가 올바르지 않습니다."
  }
  if (/User already registered/i.test(message)) {
    return "이미 가입된 이메일입니다."
  }
  if (/Invalid email/i.test(message)) {
    return "이메일 형식이 올바르지 않습니다."
  }

  return message || "인증 처리 중 오류가 발생했습니다."
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error, errorMessage: error ? mapAuthError(error) : "" }
}

export async function signUp(email, password, profile) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile,
    },
  })
  return { data, error, errorMessage: error ? mapAuthError(error) : "" }
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { error, errorMessage: error ? mapAuthError(error) : "" }
}

export async function findEmail(name, schoolName) {
  const { data, error } = await supabase.rpc("find_email_by_profile", {
    p_name: name,
    p_school_name: schoolName,
  })
  return { data, error }
}

export async function signOut() {
  return await supabase.auth.signOut()
}
