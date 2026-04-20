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

/* ── 쿠키 기반 스토리지 (Lively Wallpaper 등 localStorage 초기화 환경 대응) ── */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1년

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function removeCookie(name) {
  document.cookie = `${name}=;path=/;max-age=0`
}

const cookieStorage = {
  getItem: (key) => getCookie(key),
  setItem: (key, value) => setCookie(key, value),
  removeItem: (key) => removeCookie(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    storageKey: "sb-session",
    autoRefreshToken: true,
    persistSession: true,
  },
})
