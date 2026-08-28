-- ============================================================
-- 새 Supabase 프로젝트 초기 설정 (한 번에 실행)
-- ============================================================
-- 이 폴더의 다른 .sql 파일들은 예전 프로젝트에 순서대로 적용해온 "변경 이력"입니다.
-- 그 파일들을 새 프로젝트에 순서대로 실행하면 trigger.sql이 profiles_v2.sql에서
-- 삭제되는 컬럼(school, subject)을 참조해 회원가입이 실패합니다.
-- 새 프로젝트에는 이력 대신 이 파일 하나만 실행하세요. (최종 상태를 바로 만듭니다)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 이미 만든 테이블이 있어도 안전하게 다시 실행할 수 있습니다.
-- ============================================================


-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- 가입 정보
  name text,
  school_name text,
  atpt_code text,        -- 시도교육청 코드 (NEIS)
  school_code text,      -- 학교 코드 (NEIS)
  birthday date,
  homeroom_class text,   -- 담임 학급 (예: "3-5")
  avatar_url text,
  friend_code text unique,

  -- 설정값
  period_schedule jsonb,   -- 교시별 시작/종료 시각
  quick_links jsonb,       -- 프로필 위젯 퀵링크
  bg_prefs jsonb,          -- 배경 (색상 또는 이미지)
  widget_style jsonb,      -- 위젯 테마
  dday_events jsonb,       -- D-Day 목록
  widget_layout jsonb,     -- 그리드 위젯 배치
  folder_names jsonb,      -- 폴더 위젯 이름
  weekly_timetable jsonb,  -- 주간 시간표 캐시
  layout_mode text,                              -- 'horizontal' | 'vertical'
  schedule_view_mode text default 'week',        -- 'week' | 'month'
  today_highlight boolean default true,
  work_end_time text default '16:00',            -- 기본 퇴근 시각 (HH:MM)

  -- 동의 기록 (개인정보 보호법 제15조·제22조)
  terms_agreed_at timestamptz,     -- 이용약관 동의 시각
  privacy_agreed_at timestamptz,   -- 개인정보 수집·이용 동의 시각
  policy_version text,             -- 동의 당시 문서 버전 (src/legal/policy.js)

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 이미 만들어진 테이블에도 나중에 추가된 컬럼을 채워 넣습니다.
alter table public.profiles add column if not exists work_end_time text default '16:00';
alter table public.profiles add column if not exists terms_agreed_at   timestamptz;
alter table public.profiles add column if not exists privacy_agreed_at timestamptz;
alter table public.profiles add column if not exists policy_version    text;

alter table public.profiles enable row level security;

-- 프로필 조회(SELECT) 정책은 friends / cheers 테이블을 참조하므로
-- 그 테이블들을 만든 뒤, 이 파일 아래쪽에서 정의합니다.

drop policy if exists "본인 프로필 생성" on public.profiles;
create policy "본인 프로필 생성"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정"
  on public.profiles for update
  using (auth.uid() = id);


-- ───────────────────────── todos ─────────────────────────
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_done boolean default false,
  is_important boolean not null default false,
  position int default 0,
  due_date date,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- 이미 만들어진 테이블에도 마감일 컬럼을 채워 넣습니다.
alter table public.todos add column if not exists due_date date;

alter table public.todos enable row level security;

drop policy if exists "본인 할일 조회" on public.todos;
create policy "본인 할일 조회"
  on public.todos for select using (auth.uid() = user_id);

drop policy if exists "본인 할일 생성" on public.todos;
create policy "본인 할일 생성"
  on public.todos for insert with check (auth.uid() = user_id);

drop policy if exists "본인 할일 수정" on public.todos;
create policy "본인 할일 수정"
  on public.todos for update using (auth.uid() = user_id);

drop policy if exists "본인 할일 삭제" on public.todos;
create policy "본인 할일 삭제"
  on public.todos for delete using (auth.uid() = user_id);


-- ───────────────────────── timetable ─────────────────────────
create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null,
  start_period int not null,
  end_period int not null,
  subject text default '',
  room text default '',
  color text default '#EBEBEB',
  is_class boolean not null default false,   -- true면 학급 시간표
  created_at timestamptz default now(),
  constraint day_range check (day between 1 and 5),
  constraint period_range check (start_period between 1 and 10 and end_period between 1 and 10),
  constraint period_order check (end_period >= start_period),
  constraint timetable_unique_class unique (user_id, day, start_period, is_class)
);

-- is_class 가 NULL 이면 클라이언트 조회(.eq("is_class", false))에 안 잡히면서
-- unique 충돌만 일으키는 '유령 행'이 된다. 기존 테이블에도 NOT NULL 을 채워 넣는다.
update public.timetable set is_class = false where is_class is null;
alter table public.timetable alter column is_class set default false;
alter table public.timetable alter column is_class set not null;

alter table public.timetable enable row level security;

-- 시간표 조회(SELECT) 정책은 friends / cheers 테이블을 참조하므로
-- 그 테이블들을 만든 뒤, 이 파일 아래쪽에서 정의합니다.

drop policy if exists "본인 시간표 생성" on public.timetable;
create policy "본인 시간표 생성"
  on public.timetable for insert with check (auth.uid() = user_id);

drop policy if exists "본인 시간표 수정" on public.timetable;
create policy "본인 시간표 수정"
  on public.timetable for update using (auth.uid() = user_id);

drop policy if exists "본인 시간표 삭제" on public.timetable;
create policy "본인 시간표 삭제"
  on public.timetable for delete using (auth.uid() = user_id);


-- ───────────────────── school_events ─────────────────────
-- 학교별 공유 학사일정 (NEIS에 없는 일정을 직접 추가)
create table if not exists public.school_events (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  atpt_code text not null,
  date text not null,
  end_date text,
  name text not null,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.school_events enable row level security;

drop policy if exists "로그인 사용자 일정 조회" on public.school_events;
create policy "로그인 사용자 일정 조회"
  on public.school_events for select using (auth.uid() is not null);

drop policy if exists "로그인 사용자 일정 추가" on public.school_events;
create policy "로그인 사용자 일정 추가"
  on public.school_events for insert with check (auth.uid() = created_by);

drop policy if exists "본인 작성 일정 삭제" on public.school_events;
create policy "본인 작성 일정 삭제"
  on public.school_events for delete using (auth.uid() = created_by);

create index if not exists idx_school_events_school
  on public.school_events (atpt_code, school_code);


-- ───────────────────────── cheers (쪽지) ─────────────────────────
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  from_name text,
  to_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.cheers enable row level security;

-- 보낸 사람과 받은 사람만 볼 수 있습니다.
drop policy if exists "당사자만 쪽지 조회" on public.cheers;
create policy "당사자만 쪽지 조회"
  on public.cheers for select
  using (auth.uid() = from_id or auth.uid() = to_id);

drop policy if exists "본인 명의로 쪽지 전송" on public.cheers;
create policy "본인 명의로 쪽지 전송"
  on public.cheers for insert
  with check (auth.uid() = from_id);

-- 읽음 표시는 받은 사람이 합니다.
drop policy if exists "받은 사람이 읽음 표시" on public.cheers;
create policy "받은 사람이 읽음 표시"
  on public.cheers for update
  using (auth.uid() = to_id);

drop policy if exists "당사자만 쪽지 삭제" on public.cheers;
create policy "당사자만 쪽지 삭제"
  on public.cheers for delete
  using (auth.uid() = from_id or auth.uid() = to_id);

create index if not exists idx_cheers_to on public.cheers (to_id, created_at desc);
create index if not exists idx_cheers_from on public.cheers (from_id, created_at desc);

-- 실시간 수신(새 쪽지 알림, 읽음 표시)에 필요합니다.
do $$
begin
  alter publication supabase_realtime add table public.cheers;
exception
  when duplicate_object then null;
end;
$$;


-- ───────────────────────── friends ─────────────────────────
create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

alter table public.friends enable row level security;

drop policy if exists "당사자만 친구관계 조회" on public.friends;
create policy "당사자만 친구관계 조회"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- 친구 추가에는 INSERT 정책을 두지 않습니다.
-- 아래 add_friend_by_code() (security definer)를 거쳐야만 친구가 됩니다.
-- 그래야 사용자 id만 알아내서 임의로 친구를 만드는 일을 막을 수 있습니다.
drop policy if exists "본인이 친구 추가" on public.friends;

drop policy if exists "당사자만 친구 삭제" on public.friends;
create policy "당사자만 친구 삭제"
  on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

create index if not exists idx_friends_friend on public.friends (friend_id, user_id);


-- ───────────── profiles 조회 정책 (friends / cheers 필요) ─────────────
-- 같은 학교라는 이유만으로 서로 노출되면 안 되므로,
-- 프로필은 "본인 / 친구 / 이미 쪽지를 주고받은 상대"에게만 보입니다.
-- 아직 친구가 아닌 사람은 아래 find_by_friend_code() 로만 찾을 수 있습니다.
-- RLS는 행 단위라 컬럼을 가릴 수 없으므로, 민감한 값을 profiles에 넣지 마세요.
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


-- ───────────── timetable 조회 정책 (friends / cheers 필요) ─────────────
-- 친구 목록·쪽지함에 상대의 현재 수업 상태(수학 3교시, 공강 등)를 보여주기 위해
-- 개인 시간표는 "본인 / 친구 / 쪽지를 주고받은 상대"까지 조회를 허용합니다.
-- 학급 시간표(is_class = true)는 본인만 볼 수 있습니다.
drop policy if exists "본인 시간표 조회" on public.timetable;
drop policy if exists "본인·친구·대화상대 시간표 조회" on public.timetable;
create policy "본인·친구·대화상대 시간표 조회"
  on public.timetable for select
  using (
    auth.uid() = user_id
    or (
      is_class = false
      and (
        exists (
          select 1 from public.friends f
          where (f.user_id = auth.uid() and f.friend_id = timetable.user_id)
             or (f.friend_id = auth.uid() and f.user_id = timetable.user_id)
        )
        or exists (
          select 1 from public.cheers c
          where (c.from_id = auth.uid() and c.to_id = timetable.user_id)
             or (c.to_id = auth.uid() and c.from_id = timetable.user_id)
        )
      )
    )
  );


-- ───────────────────── 친구 코드 생성 ─────────────────────
-- 헷갈리는 글자(0/O, 1/I)를 뺀 6자리 코드
create or replace function public.generate_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;


-- ───────────────── 친구 코드로 찾기 / 추가 ─────────────────
-- 친구가 아닌 사람의 프로필은 RLS에 막히므로,
-- 코드가 정확히 일치할 때만 이름·사진을 돌려줍니다.
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


-- ───────────────── 가입 시 프로필 자동 생성 ─────────────────
-- SignUp 화면이 보내는 metadata 키와 이름이 일치해야 합니다.
-- (name, school_name, atpt_code, school_code, birthday,
--  terms_agreed, privacy_agreed, policy_version)
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
    -- 동의 시각은 클라이언트 값을 쓰지 않고 서버 시계로 기록합니다.
    case when new.raw_user_meta_data ->> 'terms_agreed'   = 'true' then now() end,
    case when new.raw_user_meta_data ->> 'privacy_agreed' = 'true' then now() end,
    new.raw_user_meta_data ->> 'policy_version'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ───────────────────── 약관 재동의 ─────────────────────
-- 동의 절차가 생기기 전에 가입한 계정은 동의 컬럼이 비어 있습니다.
-- 로그인 후 동의 화면에서 동의하면 이 함수를 호출합니다.
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


-- ───────────────────── 아이디(이메일) 찾기 ─────────────────────
-- 로그인 전에 호출되므로 anon도 실행할 수 있어야 합니다.
-- 전체 이메일이 아니라 가려진 형태만 돌려줍니다.
create or replace function public.find_email_by_profile(
  p_name text,
  p_school_name text
)
returns table (masked_email text)
language sql
security definer
set search_path = public
as $$
  select regexp_replace(u.email, '^(.{1,3})[^@]*(@.*)$', '\1***\2')
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.name = p_name
    and p.school_name = p_school_name
  limit 5;
$$;

grant execute on function public.find_email_by_profile(text, text) to anon, authenticated;


-- ───────────────────────── 회원 탈퇴 ─────────────────────────
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_own_account() to authenticated;


-- ─────────────────── 프로필 사진 저장소 ───────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 파일 경로가 "{user_id}/avatar.확장자" 형태라 첫 폴더명으로 본인 여부를 판단합니다.
drop policy if exists "아바타 공개 조회" on storage.objects;
create policy "아바타 공개 조회"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "본인 아바타 업로드" on storage.objects;
create policy "본인 아바타 업로드"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "본인 아바타 교체" on storage.objects;
create policy "본인 아바타 교체"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "본인 아바타 삭제" on storage.objects;
create policy "본인 아바타 삭제"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
