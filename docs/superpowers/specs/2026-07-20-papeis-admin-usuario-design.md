# Papéis de usuário (admin / básico) — design

Data: 2026-07-20

## Contexto

Hoje `pages`/`links`/`social_links`/`analytics` são visíveis apenas para o dono (`owner_id = auth.uid()`) via RLS, e não existe nenhum conceito de papel/permissão em `profiles`. Um usuário recém-criado só enxerga as próprias árvores, mesmo sendo funcionário da mesma empresa — não há como um administrador ver ou gerenciar o que os outros criaram, nem uma forma de conceder esse nível de acesso pela própria aplicação (só via SQL direto). Este spec adiciona dois papéis — `admin` (vê e mexe em tudo) e `user` (nível básico, comportamento atual, sem mudança) — e uma tela para administrar quem tem qual papel.

## Escopo

**Entra:**
- Coluna `profiles.role` (`'user'` | `'admin'`, default `'user'`).
- Função `is_admin()` (SECURITY DEFINER) e policies `*_admin_all`/`*_admin_select` em `pages`, `links`, `social_links`, `analytics`, `profiles` — admin vê, edita, publica e exclui árvores de qualquer usuário, e vê analytics de qualquer página.
- RPC `set_user_role(target_user_id, new_role)` (SECURITY DEFINER, valida `is_admin()` internamente) — único caminho para alterar `profiles.role`; a coluna fica com `UPDATE` revogado de `authenticated` para impedir autopromoção direta via API.
- Bootstrap do primeiro admin: `leandro-bfd@aponti.org.br` (já cadastrado) vira `admin` via `execute_sql` pontual, fora da migration versionada.
- `src/features/profiles/` — `useProfile()` (perfil do usuário logado, incluindo `role`), `useUsers()` (lista todos os perfis — só retorna dado real para admin, via RLS), `useSetUserRole()` (mutation que chama a RPC).
- `usePages` ganha um modo "admin" (sem filtro de `owner_id`, a RLS decide o que retorna); `PagesListPage` e `AnalyticsPage` mostram o dono (username) de cada árvore quando quem está logado é admin.
- `SettingsPage` deixa de ser só placeholder: seção "Usuários" (visível só para admin) lista todos os perfis com um controle de promover/rebaixar, com confirmação antes de rebaixar, e um admin não pode rebaixar a si mesmo pela UI.

**Não entra:**
- Convite de novos usuários por e-mail (continua sem tela de signup, fora do escopo original do projeto).
- Qualquer nível de papel além de `admin`/`user` (ex: "editor", "viewer").
- Auditoria/histórico de quem promoveu quem.

## Modelo de dados

```sql
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

-- pages/links/social_links: nova policy FOR ALL usando is_admin(), ao lado das existentes
create policy "pages_admin_all" on pages for all using (is_admin()) with check (is_admin());
create policy "links_admin_all" on links for all using (is_admin()) with check (is_admin());
create policy "social_links_admin_all" on social_links for all using (is_admin()) with check (is_admin());

-- analytics: admin só precisa de leitura
create policy "analytics_admin_select" on analytics for select using (is_admin());

-- profiles: admin lê todos os perfis (necessário para a tela de usuários)
create policy "profiles_admin_select_all" on profiles for select using (is_admin());

-- Única forma de alterar role: RPC SECURITY DEFINER, coluna protegida por REVOKE
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

revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
```

Bootstrap do primeiro admin (fora da migration, `execute_sql` pontual):
```sql
update profiles set role = 'admin' where id = '212ba2f1-901f-4763-9a3f-6ed893275be2'; -- leandro-bfd@aponti.org.br
```

Após a migration, regenerar `src/lib/database.types.ts` (Supabase MCP `generate_typescript_types`) para incluir a coluna `role`.

## Frontend

- `src/features/profiles/useProfile.ts` — `useQuery` buscando `profiles` do próprio usuário (`id`, `username`, `display_name`, `role`) por `session.user.id`; usado em qualquer tela que precise saber se o usuário é admin.
- `src/features/profiles/useUsers.ts` — `useQuery` listando todos os `profiles` (a RLS restringe o retorno real a quando quem chama é admin; para um usuário básico a query roda mas volta vazia/só o próprio registro — a UI nem chama esse hook fora da seção de admin).
- `src/features/profiles/useSetUserRole.ts` — `useMutation` chamando `supabase.rpc('set_user_role', { target_user_id, new_role })`, invalida a query de `useUsers`.
- `usePages(ownerId, { allPages })`: quando `allPages` é `true` (admin), remove o `.eq('owner_id', ...)` e ordena por `updated_at desc` normalmente — a RLS já garante que só um admin de fato recebe todas as linhas.
- `PagesListPage`/`AnalyticsPage`: usam `useProfile()` para decidir o modo de `usePages`/`useAnalyticsSummary`, e exibem uma coluna/badge com o `username` do dono de cada árvore quando em modo admin (join client-side com os dados de `useUsers()`, já que essas telas não precisam de um join SQL dedicado para o volume esperado).
- `SettingsPage`: se `useProfile().data?.role === 'admin'`, renderiza a seção "Usuários" — lista de `useUsers()`, cada linha com badge do papel atual e um botão para promover/rebaixar, usando `AlertDialog` (mesmo padrão de confirmação da exclusão de página) antes de rebaixar. O botão de rebaixar fica desabilitado na própria linha do admin logado (não pode se auto-rebaixar pela UI).

## Testes

- Migration: verificar via MCP (`get_advisors`, `execute_sql`) que as novas policies funcionam e que `update profiles set role = ...` direto via client anon-key falha (coluna sem `UPDATE` para `authenticated`).
- `useProfile`/`useUsers`/`useSetUserRole`: testes unitários mockando `@/lib/supabase`, seguindo o padrão já usado em `useCreatePage.test.tsx` etc.
- `SettingsPage`: teste confirmando que a seção "Usuários" só aparece quando `useProfile()` retorna `role: 'admin'`, e que o botão de rebaixar fica desabilitado na própria linha do usuário logado.
