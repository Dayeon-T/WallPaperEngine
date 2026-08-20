-- 할 일 마감일(due_date) 컬럼 추가
-- 프론트엔드(src/api/todos.js, src/widgets/ToDo.jsx)는 이미 due_date를 사용하지만
-- 실제 테이블에는 컬럼이 없어서, 날짜를 넣고 추가하면 insert 자체가 실패했습니다.
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS due_date date;
