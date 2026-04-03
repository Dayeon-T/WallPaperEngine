create table public.todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  is_done boolean default false,
  position int default 0,
  created_at timestamptz default now()
);

alter table public.todos enable row level security;

create policy "본인 할일 조회"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "본인 할일 생성"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "본인 할일 수정"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "본인 할일 삭제"
  on public.todos for delete
  using (auth.uid() = user_id);
