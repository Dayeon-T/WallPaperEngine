-- auth.users에 유저가 생성되면 profiles에 자동으로 행을 만드는 트리거
-- user_metadata에서 name, school, subject를 꺼내서 넣음

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, school, subject)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'subject'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
