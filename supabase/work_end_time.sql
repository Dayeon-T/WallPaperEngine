-- 기본 퇴근 시각 설정 추가
-- '지금 이 시각' 위젯에서 "퇴근까지 N시간 남았어요" 계산의 기준이 되는 시각.
-- 값이 없으면 앱에서 16:00을 사용합니다.

alter table public.profiles
  add column if not exists work_end_time text default '16:00';
