-- ============================================================
-- 같은 학교 자동 노출 차단 — 친구는 "친구 코드"로만
-- ============================================================
-- 문제: 같은 학교 소속이라는 이유만으로 서로 연락처 목록에 떴습니다.
-- 조치:
--   1) profiles 조회를 "본인 / 친구 / 이미 대화한 상대"로 제한
--   2) 아직 친구가 아닌 사람은 friend_code 정확히 일치할 때만 조회 가능 (RPC)
--   3) friends 테이블 직접 INSERT를 막고 코드 기반 RPC로만 추가
--
-- 이미 주고받은 쪽지와 이미 맺어진 친구 관계는 그대로 유지됩니다.
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
-- ============================================================


-- ───────── 1. 프로필 조회 범위 축소 ─────────
-- 기존 정책은 "로그인만 하면 모든 프로필 조회 가능"이었습니다.
drop policy if exists "로그인 사용자 프로필 조회" on public.profiles;
drop policy if exists "본인·친구·대화상대만 프로필 조회" on public.profiles;
create policy "본인·친구·대화상대만 프로필 조회"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friends f
      where (f.user_id = auth.uid() and f.friend_id = profiles.id)
         or (f.friend_id = auth.uid() and f.user_id = profiles.id)
    )
    or exists (
      select 1 from public.cheers c
      where (c.from_id = auth.uid() and c.to_id = profiles.id)
         or (c.to_id = auth.uid() and c.from_id = profiles.id)
    )
  );

create index if not exists idx_friends_friend on public.friends (friend_id, user_id);


-- ───────── 2. 친구 코드로 찾기 ─────────
-- 친구가 아닌 사람은 위 정책에 막히므로, 코드가 정확히 일치할 때만
-- 이 함수(security definer)를 통해 이름·사진만 돌려줍니다.
create or replace function public.find_by_friend_code(p_code text)
returns table (id uuid, name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.friend_code = upper(btrim(p_code))
    and p.id <> auth.uid()
  limit 1;
$$;

revoke execute on function public.find_by_friend_code(text) from anon, public;
grant execute on function public.find_by_friend_code(text) to authenticated;


-- ───────── 3. 친구 추가는 코드로만 ─────────
create or replace function public.add_friend_by_code(p_code text)
returns table (id uuid, name text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into target
  from public.profiles p
  where p.friend_code = upper(btrim(p_code));

  if not found then
    raise exception '해당 코드의 선생님을 찾을 수 없어요.';
  end if;

  if target.id = auth.uid() then
    raise exception '본인의 코드는 추가할 수 없어요.';
  end if;

  -- 어느 방향으로든 이미 맺어져 있으면 그대로 둡니다.
  if exists (
    select 1 from public.friends f
    where (f.user_id = auth.uid() and f.friend_id = target.id)
       or (f.user_id = target.id and f.friend_id = auth.uid())
  ) then
    raise exception '이미 추가된 친구입니다.';
  end if;

  insert into public.friends (user_id, friend_id)
  values (auth.uid(), target.id);

  return query select target.id, target.name, target.avatar_url;
end;
$$;

revoke execute on function public.add_friend_by_code(text) from anon, public;
grant execute on function public.add_friend_by_code(text) to authenticated;

-- 클라이언트가 임의의 사용자 id로 직접 친구를 만들 수 없게 막습니다.
-- (위 RPC는 security definer라 이 정책과 무관하게 동작합니다)
drop policy if exists "본인이 친구 추가" on public.friends;
