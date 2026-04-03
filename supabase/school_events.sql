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

create policy "같은 학교 사용자 조회"
  on public.school_events for select
  using (auth.uid() is not null);

create policy "로그인 사용자 추가"
  on public.school_events for insert
  with check (auth.uid() = created_by);

create policy "본인 작성 일정 삭제"
  on public.school_events for delete
  using (auth.uid() = created_by);

create index if not exists idx_school_events_school
  on public.school_events (atpt_code, school_code);
