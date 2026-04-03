-- 설정 페이지용 컬럼 추가: 교시 시간, 퀵링크, 배경, 위젯스타일, D-Day

alter table public.profiles add column if not exists period_schedule jsonb;
alter table public.profiles add column if not exists quick_links jsonb;
alter table public.profiles add column if not exists bg_prefs jsonb;
alter table public.profiles add column if not exists widget_style jsonb;
alter table public.profiles add column if not exists dday_events jsonb;

-- 회원 탈퇴용 RPC (서비스 역할 키가 아닌 경우 auth.users 직접 삭제 불가하므로 RPC 사용)
create or replace function public.delete_own_account()
returns void
language sql
security definer
as $$
  delete from auth.users where id = auth.uid();
$$;
