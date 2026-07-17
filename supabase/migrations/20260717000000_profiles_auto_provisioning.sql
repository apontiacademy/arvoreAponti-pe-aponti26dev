-- Auto-provision a profiles row whenever a new user signs up via Supabase Auth.
-- Username is derived from the email local-part, de-duplicated on unique_violation
-- since profiles.username is unique not null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]+', '', 'g'));
  if base_username is null or base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;

  loop
    begin
      insert into public.profiles (id, username)
      values (new.id, final_username);
      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      final_username := base_username || suffix::text;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
