-- 학급 시간표 기능 추가
-- 1) profiles에 담임 학급 컬럼 추가 (예: "3-5")
alter table public.profiles
  add column if not exists homeroom_class text;

-- 2) timetable에 학급 시간표 구분 플래그 추가
alter table public.timetable
  add column if not exists is_class boolean default false;

-- 3) unique 제약 조건 재생성 (is_class 포함)
alter table public.timetable
  drop constraint if exists timetable_user_id_day_start_period_key;
alter table public.timetable
  add constraint timetable_unique_class
  unique(user_id, day, start_period, is_class);
