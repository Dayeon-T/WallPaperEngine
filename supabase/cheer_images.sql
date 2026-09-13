-- ============================================================
-- 쪽지에 사진 첨부
-- ============================================================
-- 조치:
--   1) cheers 테이블에 image_url 컬럼 추가
--   2) 사진만 보낼 수도 있도록 message 의 NOT NULL 해제
--      (대신 "글 또는 사진 중 하나는 있어야 한다"는 제약을 둡니다)
--   3) 쪽지 사진 저장소(cheer-images 버킷) 생성 + 접근 정책
--
-- 기존 쪽지는 그대로 유지됩니다.
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
-- ============================================================


-- ───────── 1. cheers 테이블 ─────────
alter table public.cheers add column if not exists image_url text;

alter table public.cheers alter column message drop not null;
alter table public.cheers alter column message set default '';

-- 글도 사진도 없는 빈 쪽지는 막습니다.
alter table public.cheers drop constraint if exists cheers_has_content;
alter table public.cheers add constraint cheers_has_content
  check (coalesce(message, '') <> '' or image_url is not null) not valid;


-- ───────── 2. 쪽지 사진 저장소 ─────────
-- 파일 경로는 "{보낸 사람 id}/{랜덤 uuid}.확장자" 입니다.
-- 아바타와 같은 방식으로 공개 버킷을 쓰되, 경로에 랜덤 uuid가 들어가므로
-- 주소를 모르면 열 수 없습니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cheer-images', 'cheer-images', true, 10485760, array['image/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "쪽지 사진 조회" on storage.objects;
create policy "쪽지 사진 조회"
  on storage.objects for select
  using (bucket_id = 'cheer-images');

drop policy if exists "본인 폴더에 쪽지 사진 업로드" on storage.objects;
create policy "본인 폴더에 쪽지 사진 업로드"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cheer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "본인 쪽지 사진 삭제" on storage.objects;
create policy "본인 쪽지 사진 삭제"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cheer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
