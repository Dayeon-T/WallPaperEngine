create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  school text,
  subject text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "본인 프로필 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "본인 프로필 수정"
  on public.profiles for update
  using (auth.uid() = id);

create policy "가입 시 프로필 생성"
  on public.profiles for insert
  with check (auth.uid() = id);
