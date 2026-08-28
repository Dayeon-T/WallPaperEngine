import { supabase } from "../lib/supabase"

/* ───── 교사 쪽 (로그인 필요) ───── */

export async function fetchMyBoard(userId) {
  const { data, error } = await supabase
    .from("classroom_boards")
    .select("board_code, notice, notice_at, created_at")
    .eq("owner_id", userId)
    .maybeSingle()
  return { data, error }
}

// 발급·재발급 겸용. 담임 여부는 서버(RPC)가 다시 검사한다.
export async function issueBoardCode() {
  const { data, error } = await supabase.rpc("issue_board_code")
  return { data, error }
}

// notice에 null을 주면 공지를 내린다
export async function updateBoardNotice(userId, notice) {
  const { error } = await supabase
    .from("classroom_boards")
    .update({ notice, notice_at: notice ? new Date().toISOString() : null })
    .eq("owner_id", userId)
  return { error }
}

export async function deleteMyBoard(userId) {
  const { error } = await supabase
    .from("classroom_boards")
    .delete()
    .eq("owner_id", userId)
  return { error }
}

/* ───── 실시간 갱신 신호 ───── */

// 교사 쪽에서 학급 관련 데이터가 바뀌면 board:{code} 채널로 "갱신됨" 신호만 쏜다.
// payload에 데이터를 싣지 않으므로 채널을 엿들어도 얻는 게 없고,
// 칠판은 신호를 받으면 get_board_view RPC를 다시 호출한다.
// 신호 실패는 치명적이지 않다 — 칠판이 주기 폴링으로 따라잡는다.

// 구독하지 않은 채널의 send는 HTTP 브로드캐스트로 전송된다
export async function signalBoardCode(code) {
  if (!code) return
  const channel = supabase.channel(`board:${code}`)
  try {
    await channel.send({ type: "broadcast", event: "refresh", payload: {} })
  } catch {
    /* 폴링 폴백에 맡긴다 */
  } finally {
    supabase.removeChannel(channel)
  }
}

export async function notifyBoardRefresh(userId) {
  try {
    const { data } = await fetchMyBoard(userId)
    if (data?.board_code) await signalBoardCode(data.board_code)
  } catch {
    /* 폴링 폴백에 맡긴다 */
  }
}

/* ───── 칠판 쪽 (로그인 없음) ───── */

// 코드가 틀리거나 교사가 담임을 해제했으면 data가 null로 온다.
export async function fetchBoardView(code) {
  const { data, error } = await supabase.rpc("get_board_view", { p_code: code })
  return { data, error }
}
