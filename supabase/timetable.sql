create table public.timetable (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day int not null,
  start_period int not null,
  end_period int not null,
  subject text default '',
  room text default '',
  color text default '#EBEBEB',
  created_at timestamptz default now(),
  constraint day_range check (day between 1 and 5),
  constraint period_range check (start_period between 1 and 10 and end_period between 1 and 10),
  constraint period_order check (end_period >= start_period),
  unique(user_id, day, start_period)
);

alter table public.timetable enable row level security;

create policy "본인 시간표 조회"
  on public.timetable for select
  using (auth.uid() = user_id);

create policy "본인 시간표 생성"
  on public.timetable for insert
  with check (auth.uid() = user_id);

create policy "본인 시간표 수정"
  on public.timetable for update
  using (auth.uid() = user_id);

create policy "본인 시간표 삭제"
  on public.timetable for delete
  using (auth.uid() = user_id);


ALTER TABLE public.timetable ADD COLUMN room text default '';