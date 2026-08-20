-- ============================================================
-- 약관 / 개인정보 수집·이용 동의 기록
-- ============================================================
-- 개인정보 보호법 제15조에 따라 동의를 받아야 하고, 분쟁이 생기면
-- "받았다"는 사실을 입증해야 합니다. 동의 시각과 동의한 문서 버전을 남깁니다.
--
-- 동의 시각은 클라이언트가 보낸 값을 믿지 않고 DB에서 now()로 찍습니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
-- ============================================================

alter table public.profiles add column if not exists terms_agreed_at   timestamptz;
alter table public.profiles add column if not exists privacy_agreed_at timestamptz;
alter table public.profiles add column if not exists policy_version    text;

comment on column public.profiles.terms_agreed_at   is '이용약관 동의 시각 (개인정보 보호법 제22조: 항목별 개별 동의)';
comment on column public.profiles.privacy_agreed_at is '개인정보 수집·이용 동의 시각';
comment on column public.profiles.policy_version    is '동의 당시 문서 버전 (src/legal/policy.js의 POLICY_VERSION)';


-- 가입 트리거에 동의 기록을 추가합니다.
-- SignUp 화면이 보내는 metadata 키와 이름이 일치해야 합니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, name, school_name, atpt_code, school_code, birthday, friend_code,
    terms_agreed_at, privacy_agreed_at, policy_version
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'school_name',
    new.raw_user_meta_data ->> 'atpt_code',
    new.raw_user_meta_data ->> 'school_code',
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    public.generate_friend_code(),
    -- 시각은 클라이언트 값을 쓰지 않고 서버 시계로 기록합니다.
    case when new.raw_user_meta_data ->> 'terms_agreed'   = 'true' then now() end,
    case when new.raw_user_meta_data ->> 'privacy_agreed' = 'true' then now() end,
    new.raw_user_meta_data ->> 'policy_version'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- 동의 없이 만들어진 계정을 확인할 때 쓰세요.
--   select id, name, created_at from public.profiles where privacy_agreed_at is null;


-- ───────────── 기존 가입자 재동의 ─────────────
-- 동의 절차가 생기기 전에 가입한 계정은 위 컬럼이 비어 있습니다.
-- 그런 계정은 로그인 후 동의 화면을 띄우고, 동의하면 이 함수를 호출합니다.
-- 동의 시각은 여기서도 서버 시계로 찍습니다.
create or replace function public.agree_to_policies(p_version text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set terms_agreed_at   = coalesce(terms_agreed_at, now()),
         privacy_agreed_at = coalesce(privacy_agreed_at, now()),
         policy_version    = p_version
   where id = auth.uid();
$$;

revoke execute on function public.agree_to_policies(text) from anon, public;
grant execute on function public.agree_to_policies(text) to authenticated;
