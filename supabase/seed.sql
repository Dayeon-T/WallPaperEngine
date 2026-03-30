-- 1) 먼저 Supabase 대시보드 > Authentication > Users 에서
--    테스트 유저를 하나 만드세요 (예: test@test.com / password123)
--
-- 2) 만든 유저의 User UID를 복사하세요
--
-- 3) 아래 'YOUR_USER_UUID_HERE' 를 그 UID로 바꾸고 SQL Editor에서 실행

insert into public.profiles (id, name, school, subject)
values (
  'YOUR_USER_UUID_HERE',
  '홍길동',
  '한국중학교',
  '수학'
);
