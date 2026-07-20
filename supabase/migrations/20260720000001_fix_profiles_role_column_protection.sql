-- The previous migration (20260720000000_user_roles.sql) tried to lock down the new
-- `role` column with `revoke update (role) on profiles from authenticated`. That statement
-- is a no-op for this purpose: Postgres column-level REVOKE only removes a column-specific
-- ACL entry, it does not narrow the pre-existing table-level UPDATE privilege that
-- `authenticated` already holds on `profiles` (granted broadly when the schema was first
-- created, with no column-level grants ever having existed). Since the `profiles_update_own`
-- RLS policy only restricts by row (auth.uid() = id) and not by column, any authenticated
-- user could still run `update profiles set role = 'admin' where id = auth.uid()` directly
-- and bypass set_user_role() entirely. Confirmed live: after the previous migration, a
-- test UPDATE as the `authenticated` role successfully changed a real user's `role` to
-- 'admin' with no permission error.
--
-- Fix: revoke the blanket table-level UPDATE privilege and re-grant UPDATE only on the
-- columns a user may self-edit (username, display_name, avatar_url, bio). `role` is excluded
-- (admin-only, via set_user_role()); `id`/`created_at` are excluded too (immutable).
revoke update on profiles from authenticated;
grant update (username, display_name, avatar_url, bio) on profiles to authenticated;
