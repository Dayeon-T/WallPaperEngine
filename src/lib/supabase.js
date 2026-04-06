import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

if (!isValidHttpUrl(supabaseUrl)) {
  throw new Error(
    [
      "Supabase 설정 오류: VITE_SUPABASE_URL이 올바른 http(s) URL이 아닙니다.",
      "예) VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co",
      "현재 값은 .env의 VITE_SUPABASE_URL을 확인하세요.",
    ].join("\n"),
  )
}

if (typeof supabaseAnonKey !== "string" || supabaseAnonKey.trim() === "") {
  throw new Error(
    [
      "Supabase 설정 오류: VITE_SUPABASE_ANON_KEY가 비어있습니다.",
      "Supabase 콘솔의 Project Settings → API → anon public key 값을 넣어주세요.",
    ].join("\n"),
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
