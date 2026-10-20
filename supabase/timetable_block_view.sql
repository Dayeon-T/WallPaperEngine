-- 시간표를 교시당 한 칸으로 저장하고, 블록타임은 표시에서만 합친다
--
-- 예전에는 블록타임을 한 row의 범위(start_period ~ end_period)로 저장해서
-- 아래 교시에는 자기 row가 없었다. 이제는 블록으로 넣든 하나씩 넣든 같은 값이
-- 저장되도록 교시마다 row를 두고, 같은 수업이 이어지면 화면에서만 하나로 그린다.
-- 앱도 불러올 때 자기 시간표를 알아서 펼치지만, 친구 시간표(읽기 전용)까지 한 번에
-- 정리하려면 이 스크립트를 한 번 실행한다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run

-- 1) 표시 설정: 블록타임 합쳐 보기 (설정 → 레이아웃)
alter table public.profiles
  add column if not exists timetable_block_view boolean default true;

-- 2) 범위로 저장된 row를 교시별 row로 펼친다.
--    점심 칸(5)은 범위 안에 끼어 있어도 건너뛴다 (앱의 entryCoversPeriod와 같은 규칙).
--    같은 교시에 이미 자기 row가 있으면 그 row를 남긴다.
insert into public.timetable (user_id, day, start_period, end_period, subject, room, color, is_class)
select t.user_id, t.day, p, p, t.subject, t.room, t.color, t.is_class
from public.timetable t
cross join lateral generate_series(t.start_period + 1, t.end_period) as p
where t.end_period > t.start_period
  and (p <> 5 or t.end_period = 5)
on conflict (user_id, day, start_period, is_class) do nothing;

-- 3) 원래 row는 자기 교시 한 칸만 가리키게 줄인다.
update public.timetable
set end_period = start_period
where end_period > start_period;
