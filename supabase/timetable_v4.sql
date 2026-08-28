-- 친구 목록·쪽지함의 "현재 수업 상태"가 다시 보이도록 시간표 조회 정책 확장
--
-- 새 프로젝트(setup_new_project.sql)의 시간표 SELECT 정책이 본인 것만 허용해서,
-- 친구 시간표 조회가 빈 결과로 돌아오고 상태(수학 3교시, 공강 등)가 표시되지 않았다.
-- 프로필 조회 정책과 같은 기준(본인 / 친구 / 쪽지를 주고받은 상대)으로 맞추되,
-- 학급 시간표(is_class = true)는 본인만 볼 수 있게 남겨 둔다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run

drop policy if exists "본인 시간표 조회" on public.timetable;
drop policy if exists "본인·친구·대화상대 시간표 조회" on public.timetable;
create policy "본인·친구·대화상대 시간표 조회"
  on public.timetable for select
  using (
    auth.uid() = user_id
    or (
      is_class = false
      and (
        exists (
          select 1 from public.friends f
          where (f.user_id = auth.uid() and f.friend_id = timetable.user_id)
             or (f.friend_id = auth.uid() and f.user_id = timetable.user_id)
        )
        or exists (
          select 1 from public.cheers c
          where (c.from_id = auth.uid() and c.to_id = timetable.user_id)
             or (c.to_id = auth.uid() and c.from_id = timetable.user_id)
        )
      )
    )
  );
