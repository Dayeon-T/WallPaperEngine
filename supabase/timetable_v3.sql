-- ============================================================
-- timetable 제약 정리 (2026-08)
-- ============================================================
-- 증상: 특정 사용자만 특정 요일/교시에 시간표 입력이 저장되지 않음.
--
-- 원인 후보 두 가지를 한 번에 정리합니다.
--  (1) is_class 가 NULL 인 '유령 행'
--      클라이언트는 .eq("is_class", false) 로 조회하므로 NULL 행은 화면에 안 보이는데,
--      DB 에는 남아 있어 같은 칸에 새로 넣으려 하면 unique 충돌이 납니다.
--  (2) timetable_v2.sql 이 적용되지 않아 예전 3컬럼 unique 가 남아 있는 경우
--      학급 시간표(is_class=true)와 내 시간표(false)가 같은 칸을 쓸 수 없게 되고,
--      insert 가 23505 로 실패하지만 화면에는 아무 메시지도 뜨지 않습니다.
--
-- 여러 번 실행해도 안전합니다(멱등).
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
-- ============================================================


-- ── 0) 실행 전 현재 상태 확인용 (결과만 보고 넘어가면 됩니다) ──
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid = 'public.timetable'::regclass and contype = 'u';
-- select count(*) from public.timetable where is_class is null;


-- ── 1) is_class NULL 행 정리 후 NOT NULL 고정 ──
update public.timetable set is_class = false where is_class is null;

alter table public.timetable alter column is_class set default false;
alter table public.timetable alter column is_class set not null;


-- ── 2) 예전 3컬럼 unique 제약이 남아 있으면 제거 ──
-- timetable_v2.sql 은 기본 이름(timetable_user_id_day_start_period_key)으로만
-- drop 하므로, 이름이 다르게 붙은 경우를 대비해 정의로 찾아서 지웁니다.
do $$
declare c text;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.timetable'::regclass
       and contype = 'u'
       and pg_get_constraintdef(oid) = 'UNIQUE (user_id, day, start_period)'
  loop
    execute format('alter table public.timetable drop constraint %I', c);
    raise notice '예전 unique 제약 제거: %', c;
  end loop;
end $$;


-- ── 3) 4컬럼 unique 보장 (upsert 의 onConflict 대상) ──
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.timetable'::regclass
       and contype = 'u'
       and pg_get_constraintdef(oid) = 'UNIQUE (user_id, day, start_period, is_class)'
  ) then
    alter table public.timetable
      add constraint timetable_unique_class unique (user_id, day, start_period, is_class);
    raise notice 'timetable_unique_class 생성';
  end if;
end $$;


-- ── 4) 실행 후 확인 ──
-- 아래 결과에 UNIQUE (user_id, day, start_period, is_class) 하나만 남아야 정상입니다.
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid = 'public.timetable'::regclass and contype = 'u';
