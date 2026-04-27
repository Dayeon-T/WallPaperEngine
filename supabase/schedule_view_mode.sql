-- 학사일정 주간/월간 뷰 선호도 저장
alter table public.profiles
  add column if not exists schedule_view_mode text default 'week';
