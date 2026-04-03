-- profiles 테이블 스키마 업데이트: 학교코드 분리 + 생일 추가 + 담당과목 제거

alter table public.profiles drop column if exists subject;
alter table public.profiles drop column if exists school;

alter table public.profiles add column if not exists school_name text;
alter table public.profiles add column if not exists atpt_code text;
alter table public.profiles add column if not exists school_code text;
alter table public.profiles add column if not exists birthday date;
