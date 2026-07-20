-- Two hardening fixes found in code review of the admin-role migration
-- (20260720000000_user_roles.sql), both real gaps on the live project:
--
-- 1. set_user_role() had no guard against an admin changing their OWN role. The plan's
--    self-demotion protection (Task 10) is UI-only (a disabled switch on the caller's own
--    row) — not a real security boundary. Anyone with API/curl access could call
--    set_user_role(<their own id>, 'user') and demote themselves, potentially leaving the
--    project with zero admins and no in-app recovery path. Fix: reject
--    target_user_id = auth.uid() inside the function itself. Since an admin can never
--    touch their own row through this RPC, at least one admin always survives any
--    sequence of calls — simpler and more complete than counting remaining admins.
--
-- 2. profiles_insert_own's WITH CHECK didn't constrain `role` at all, so RLS provided no
--    defense-in-depth on that axis (only handle_new_user()'s trigger currently controls
--    profile creation; a client-side insert collides on the primary key today, but that's
--    an accident of the current insert path, not something RLS itself enforces). Fix:
--    require role = 'user' (the column's own default) in the WITH CHECK, so a self-insert
--    can never set role to 'admin' even if the insert path changes later.

create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'cannot change your own role';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'invalid role: %', new_role;
  end if;
  update profiles set role = new_role where id = target_user_id;
end;
$$;

drop policy "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert
  with check ((select auth.uid()) = id and role = 'user');
