-- ─────────────────────────────────────────────────────────
-- 교실 대시보드(전자칠판) 2단계: get_board_view 확장
-- 칠판 기본 화면에 필요한 데이터(학급 시간표·교시 시간·학사일정·D-Day·급식용 학교 코드)를 반환한다.
-- classroom_board.sql 실행 후에 Supabase SQL Editor에서 실행하세요. (재실행해도 안전)
--
-- 반환하지 않는 것(칠판은 비로그인 공용 기기):
--   개인 시간표(is_class=false), 이번주 교환의 개인 기록(weekly_timetable.map),
--   할 일·쪽지·프로필(이름·사진)·퀵링크 등 개인 데이터 일체.
-- ─────────────────────────────────────────────────────────

create or replace function public.get_board_view(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  b record;
  p record;
begin
  select owner_id, notice, notice_at into b
  from public.classroom_boards
  where board_code = upper(trim(p_code));

  if not found then
    return null;
  end if;

  select homeroom_class, period_schedule, weekly_timetable,
         dday_events, atpt_code, school_code
  into p
  from public.profiles
  where id = b.owner_id;

  -- 담임 학급을 지운 계정의 칠판은 빈 화면 → 연결 화면으로 돌아간다
  if coalesce(p.homeroom_class, '') = '' then
    return null;
  end if;

  return jsonb_build_object(
    'class_name', p.homeroom_class,
    'notice',     b.notice,
    'notice_at',  b.notice_at,
    'period_schedule', p.period_schedule,
    -- 이번주 교환 기록 중 학급(classMap) 것만 노출한다. map(개인 시간표 교환)은 개인 데이터.
    'weekly_timetable', case
      when p.weekly_timetable is null then null
      else jsonb_build_object(
        'week',     p.weekly_timetable -> 'week',
        'classMap', coalesce(p.weekly_timetable -> 'classMap', '{}'::jsonb)
      )
    end,
    'dday_events', coalesce(p.dday_events, '[]'::jsonb),
    -- 급식은 NEIS 공개 API라 칠판이 직접 조회한다. 학교 코드만 넘겨준다.
    'atpt_code',   p.atpt_code,
    'school_code', p.school_code,
    'timetable', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', t.day,
        'start_period', t.start_period,
        'end_period', t.end_period,
        'subject', t.subject,
        'room', t.room
      ) order by t.day, t.start_period), '[]'::jsonb)
      from public.timetable t
      where t.user_id = b.owner_id and t.is_class = true
    ),
    'school_events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', e.date,
        'end_date', e.end_date,
        'name', e.name
      ) order by e.date), '[]'::jsonb)
      from public.school_events e
      where e.atpt_code = p.atpt_code and e.school_code = p.school_code
    )
  );
end;
$$;
