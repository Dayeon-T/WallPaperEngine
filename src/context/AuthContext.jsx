import { createContext, useContext, useState, useEffect } from "react"
import { supabase, readStoredSession, isSessionFresh } from "../lib/supabase"

const AuthContext = createContext()

// 저장된 세션을 동기적으로 읽어 첫 렌더링부터 로그인 위젯/프로필을 바로 보여준다.
// getSession()을 기다리면 그동안 위젯 자리가 빈 칸으로 남는다.
function readInitialAuth() {
  const stored = readStoredSession()
  if (!stored) return { user: null, loading: false }
  if (isSessionFresh(stored)) return { user: stored.user ?? null, loading: false }
  // 만료된 세션은 갱신 결과를 봐야 로그인 여부를 알 수 있다.
  return { user: null, loading: true }
}

export function AuthProvider({ children }) {
  const [{ user, loading }, setAuth] = useState(readInitialAuth)

  useEffect(() => {
    // 이미 같은 사용자로 렌더링 중이면 상태를 바꾸지 않는다.
    // (user 객체가 새로 들어오면 이를 의존하는 위젯들이 전부 다시 조회한다)
    const applySession = (session) => {
      const nextUser = session?.user ?? null
      setAuth((prev) =>
        !prev.loading && prev.user?.id === nextUser?.id
          ? prev
          : { user: nextUser, loading: false },
      )
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => applySession(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => applySession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
