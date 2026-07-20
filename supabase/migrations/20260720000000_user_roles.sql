alter table profiles add column role text not null default 'user' check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- is_admin() precisa ser executável por anon também: a policy pages_admin_all abaixo
-- não tem "TO" explícito, então o Postgres avalia is_admin() até para requests anônimos
-- de visitantes da página pública. Sem essa GRANT, a leitura da página pública quebraria
-- com "permission denied for function is_admin" para qualquer visitante não autenticado.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "pages_admin_all" on pages for all using (is_admin()) with check (is_admin());
create policy "links_admin_all" on links for all using (is_admin()) with check (is_admin());
create policy "social_links_admin_all" on social_links for all using (is_admin()) with check (is_admin());
create policy "analytics_admin_select" on analytics for select using (is_admin());
create policy "profiles_admin_select_all" on profiles for select using (is_admin());

-- Único caminho para alterar o papel de alguém: a RPC abaixo. Ninguém (nem o próprio
-- admin) pode fazer UPDATE direto na coluna role via API/anon-key.
revoke update (role) on profiles from authenticated;

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
  if new_role not in ('user', 'admin') then
    raise exception 'invalid role: %', new_role;
  end if;
  update profiles set role = new_role where id = target_user_id;
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;
