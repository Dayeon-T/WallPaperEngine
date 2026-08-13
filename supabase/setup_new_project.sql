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

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 주의: 동료 목록, 친구 코드 검색, 메시지 상대 이름 표시 기능 때문에
-- 로그인한 사용자는 다른 사람의 프로필 행도 읽을 수 있어야 합니다.
-- RLS는 행 단위라 컬럼을 가릴 수 없으므로, 민감한 값을 profiles에 넣지 마세요.
drop policy if exists "로그인 사용자 프로필 조회" on public.profiles;
create policy "로그인 사용자 프로필 조회"
  on public.profiles for select
  using (auth.uid() is not null);

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
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

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
  is_class boolean default false,   -- true면 학급 시간표
  created_at timestamptz default now(),
  constraint day_range check (day between 1 and 5),
  constraint period_range check (start_period between 1 and 10 and end_period between 1 and 10),
  constraint period_order check (end_period >= start_period),
  constraint timetable_unique_class unique (user_id, day, start_period, is_class)
);

alter table public.timetable enable row level security;

drop policy if exists "본인 시간표 조회" on public.timetable;
create policy "본인 시간표 조회"
  on public.timetable for select using (auth.uid() = user_id);

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

drop policy if exists "본인이 친구 추가" on public.friends;
create policy "본인이 친구 추가"
  on public.friends for insert
  with check (auth.uid() = user_id);

drop policy if exists "당사자만 친구 삭제" on public.friends;
create policy "당사자만 친구 삭제"
  on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);


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


-- ───────────────── 가입 시 프로필 자동 생성 ─────────────────
-- SignUp 화면이 보내는 metadata 키와 이름이 일치해야 합니다.
-- (name, school_name, atpt_code, school_code, birthday)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, name, school_name, atpt_code, school_code, birthday, friend_code
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'school_name',
    new.raw_user_meta_data ->> 'atpt_code',
    new.raw_user_meta_data ->> 'school_code',
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    public.generate_friend_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


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
