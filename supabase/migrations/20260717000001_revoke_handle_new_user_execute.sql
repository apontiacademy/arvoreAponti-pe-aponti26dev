-- handle_new_user is SECURITY DEFINER and only meant to run via the auth.users
-- trigger; triggers invoke it regardless of grants, but leaving default EXECUTE
-- grants exposes it as a callable RPC (/rest/v1/rpc/handle_new_user) to anon
-- and authenticated roles. Lock it down to trigger-only use.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
