-- ─────────────────────────────────────────────────────────
-- 교실 대시보드(전자칠판) 1단계: 페어링
-- classroom_boards 테이블 + 코드 발급 RPC + 칠판 조회 RPC
-- Supabase SQL Editor에 전체를 붙여넣고 실행하세요. (재실행해도 안전)
-- ─────────────────────────────────────────────────────────

create table if not exists public.classroom_boards (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  board_code text not null unique,          -- 6자리, 친구 코드와 같은 문자셋
  notice     text,                          -- 현재 공지 (null이면 없음, 4단계에서 사용)
  notice_at  timestamptz,
  created_at timestamptz default now(),
  unique (owner_id)                         -- MVP: 교사당 교실 1개
);

alter table public.classroom_boards enable row level security;

-- owner만 조회·수정·삭제할 수 있다.
-- 생성·코드 재발급은 담임 검사가 필요하므로 issue_board_code RPC로만 한다 (insert 정책 없음).
-- 칠판(비로그인)은 이 테이블을 직접 읽지 못하고 get_board_view RPC만 호출할 수 있다.
drop policy if exists "boards_select_own" on public.classroom_boards;
create policy "boards_select_own" on public.classroom_boards
  for select using (auth.uid() = owner_id);

drop policy if exists "boards_update_own" on public.classroom_boards;
create policy "boards_update_own" on public.classroom_boards
  for update using (auth.uid() = owner_id);

drop policy if exists "boards_delete_own" on public.classroom_boards;
create policy "boards_delete_own" on public.classroom_boards
  for delete using (auth.uid() = owner_id);


-- ───────────────────── 코드 발급·재발급 ─────────────────────
-- 담임(homeroom_class 입력자)만 발급할 수 있다.
-- 메뉴 숨김은 클라이언트 차단일 뿐이므로 서버에서도 반드시 검사한다.
-- 이미 교실이 있으면 코드만 새로 바꾼다 → 이전 코드는 즉시 무효.
create or replace function public.issue_board_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 0/O, 1/I 제외
  code text;
  i int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and coalesce(homeroom_class, '') <> ''
  ) then
    raise exception '담임 학급을 먼저 설정해주세요.';
  end if;

  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.classroom_boards where board_code = code);
  end loop;

  insert into public.classroom_boards (owner_id, board_code)
  values (auth.uid(), code)
  on conflict (owner_id) do update set board_code = excluded.board_code;

  return code;
end;
$$;


-- ───────────────────── 칠판 조회 ─────────────────────
-- 칠판(로그인 없음)이 호출할 수 있는 유일한 창구.
-- 학급 정보 외의 것(개인 시간표·할 일·쪽지·프로필)은 절대 반환하지 않는다.
-- 코드가 틀리거나, 교사가 담임 학급을 지웠으면 null → 칠판은 연결 화면으로 돌아간다.
-- 2단계에서 시간표·급식·일정·교시 시간 필드를 여기에 추가한다.
create or replace function public.get_board_view(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  b record;
  v_class text;
begin
  select owner_id, notice, notice_at into b
  from public.classroom_boards
  where board_code = upper(trim(p_code));

  if not found then
    return null;
  end if;

  select homeroom_class into v_class
  from public.profiles
  where id = b.owner_id;

  if coalesce(v_class, '') = '' then
    return null;
  end if;

  return jsonb_build_object(
    'class_name', v_class,
    'notice',     b.notice,
    'notice_at',  b.notice_at
  );
end;
$$;
