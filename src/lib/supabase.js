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

const STORAGE_KEY = "sb-session"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
  },
})

// getSession()은 토큰이 만료됐으면 갱신 요청이 끝날 때까지 resolve되지 않는다.
// 첫 렌더링에서 로그인 상태를 바로 판단하려면 저장된 값을 직접 읽어야 한다.
export function readStoredSession() {
  try {
    const raw = getCookie(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.access_token ? session : null
  } catch {
    // 쿠키 4KB 제한으로 잘렸거나 형식이 깨진 경우
    return null
  }
}

// 만료 10초 전부터는 곧 갱신될 세션으로 보고 신선하지 않다고 판단한다.
export function isSessionFresh(session) {
  if (!session?.expires_at) return false
  return session.expires_at * 1000 > Date.now() + 10_000
}
