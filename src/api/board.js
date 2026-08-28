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

export async function deleteMyBoard(userId) {
  const { error } = await supabase
    .from("classroom_boards")
    .delete()
    .eq("owner_id", userId)
  return { error }
}

/* ───── 칠판 쪽 (로그인 없음) ───── */

// 코드가 틀리거나 교사가 담임을 해제했으면 data가 null로 온다.
export async function fetchBoardView(code) {
  const { data, error } = await supabase.rpc("get_board_view", { p_code: code })
  return { data, error }
}
