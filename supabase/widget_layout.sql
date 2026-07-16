-- 그리드 스냅 위젯 배치 저장 컬럼
-- 구조: { "horizontal": { "profile": {"x":0,"y":0,"w":5,"h":4}, ... }, "vertical": { ... } }
alter table public.profiles
  add column if not exists widget_layout jsonb;
