# Papéis de usuário (admin / básico) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um papel `admin` (vê e gerencia tudo — árvores, links e analytics de qualquer usuário) e `user` (nível básico, comportamento atual inalterado), com uma tela em Configurações para promover/rebaixar usuários.

**Architecture:** Coluna `profiles.role` + função `is_admin()` (SECURITY DEFINER) reaproveitada em novas policies `*_admin_all`/`*_admin_select` ao lado das policies de dono/público já existentes; a coluna `role` só pode ser alterada por uma RPC `set_user_role` (a coluna fica com `UPDATE` revogado de `authenticated`). No front-end, `usePages`/`useAnalyticsSummary` ganham um modo "todas as páginas" consumido por `PagesListPage`/`AnalyticsPage` quando `useProfile()` indica `role: 'admin'`; `SettingsPage` ganha uma seção real de gestão de usuários.

**Tech Stack:** Supabase (Postgres + RLS + RPC), TanStack Query, React Router, shadcn/ui (`Switch`, `AlertDialog`, `Badge`).

---

## Referências

- Spec: `docs/superpowers/specs/2026-07-20-papeis-admin-usuario-design.md`
- Projeto Supabase: `arvore-aponti`, ref `evkmyrozkpqehunnlbif`
- Primeiro admin: `leandro-bfd@aponti.org.br`, `auth.users.id = '212ba2f1-901f-4763-9a3f-6ed893275be2'`

## Pré-condições verificadas

- Branch `feature/admin-user-roles` já existe, criada a partir de `develop` (que já inclui o PR #28, sidebar/breadcrumb do shadcn).
- `profiles` hoje tem `id, username, display_name, avatar_url, bio, created_at` — sem coluna de papel.
- RLS atual: donos só veem as próprias `pages`/`links`/`social_links`/`analytics`; público só lê o que está publicado; `profiles` só permite ao dono ler/editar o próprio registro.
- Componentes shadcn disponíveis: `Switch` (`src/components/ui/switch.tsx`), `AlertDialog`, `Badge`.

---

### Task 1: Migration — coluna `role`, `is_admin()` e policies de admin

**Files:**
- Create: `supabase/migrations/20260720000000_user_roles.sql`

- [ ] **Step 1: Escrever a migração**

`supabase/migrations/20260720000000_user_roles.sql`:

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
```

- [ ] **Step 2: Aplicar via MCP**

Via `mcp__claude_ai_Supabase__apply_migration`, `project_id: evkmyrozkpqehunnlbif`, `name: "user_roles"`, SQL acima.
Expected: sucesso, sem erros de sintaxe/constraint.

- [ ] **Step 3: Verificar policies e função**

Via `mcp__claude_ai_Supabase__execute_sql` (project_id `evkmyrozkpqehunnlbif`):
```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and policyname like '%admin%'
order by tablename;
```
Expected: `pages_admin_all` (ALL), `links_admin_all` (ALL), `social_links_admin_all` (ALL), `analytics_admin_select` (SELECT), `profiles_admin_select_all` (SELECT).

- [ ] **Step 4: Verificar que a página pública continua acessível por anon (regressão crítica)**

Via `execute_sql`:
```sql
set role anon;
select count(*) from pages where is_published = true;
reset role;
```
Expected: roda sem erro `permission denied for function is_admin` e retorna uma contagem (mesmo que 0) — confirma que `pages_public_select_published` continua funcionando para anon depois da nova policy `pages_admin_all` ser avaliada junto.

- [ ] **Step 5: Verificar que `role` não pode ser alterado via UPDATE direto**

Via `execute_sql`:
```sql
set role authenticated;
set request.jwt.claims to '{"sub": "212ba2f1-901f-4763-9a3f-6ed893275be2"}';
update profiles set role = 'admin' where id = '212ba2f1-901f-4763-9a3f-6ed893275be2';
reset role;
```
Expected: erro de permissão na coluna `role` (`permission denied for table profiles` ou equivalente sobre a coluna).

- [ ] **Step 6: Conferir advisors**

Via `mcp__claude_ai_Supabase__get_advisors` (security e performance) no projeto `evkmyrozkpqehunnlbif`.
Expected: nenhum novo finding introduzido pela migração (o INFO de `unused_index`/`multiple_permissive_policies` pré-existente pode continuar aparecendo — não é regressão desta task).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260720000000_user_roles.sql
git commit -m "feat: adiciona papel admin (coluna role, is_admin() e policies)"
```

---

### Task 2: Promover o primeiro admin e regenerar os tipos TypeScript

**Files:**
- Modify: `src/lib/database.types.ts` (regenerado, não editado manualmente)

- [ ] **Step 1: Promover `leandro-bfd@aponti.org.br` a admin**

Via `execute_sql` (project_id `evkmyrozkpqehunnlbif`) — **não** entra em arquivo de migração versionado, é dado de ambiente, não schema:
```sql
update profiles set role = 'admin' where id = '212ba2f1-901f-4763-9a3f-6ed893275be2';
```

- [ ] **Step 2: Confirmar**

```sql
select id, username, role from profiles where id = '212ba2f1-901f-4763-9a3f-6ed893275be2';
```
Expected: `role = 'admin'`. Rodar também `select count(*) from profiles where role = 'user';` e confirmar que os demais usuários continuam com o papel básico (default `'user'`, ninguém mais deveria ter sido afetado pela migração).

- [ ] **Step 3: Regenerar `src/lib/database.types.ts`**

Via `mcp__claude_ai_Supabase__generate_typescript_types` (project_id `evkmyrozkpqehunnlbif`), sobrescrever `src/lib/database.types.ts` com o resultado (usar a ferramenta Write com o conteúdo retornado, arquivo inteiro).

- [ ] **Step 4: Verificar**

```bash
grep -n "role" src/lib/database.types.ts
grep -n "set_user_role\|is_admin" src/lib/database.types.ts
npm run typecheck
```
Expected: `role` aparece nos tipos `Row`/`Insert`/`Update` de `profiles`; `set_user_role` aparece em `Functions`; `npm run typecheck` sai com exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "chore: regenera database.types.ts com a coluna role e a RPC set_user_role"
```

---

### Task 3: `useProfile` — saber o papel do usuário logado

**Files:**
- Create: `src/features/profiles/useProfile.ts`, `src/features/profiles/useProfile.test.tsx`

- [ ] **Step 1: Escrever o teste**

`src/features/profiles/useProfile.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useProfile } from './useProfile'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useProfile', () => {
  it('busca o perfil do usuario pelo id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'user-1', username: 'leandrobfd', role: 'admin' },
      error: null,
    })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => useProfile('user-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
    expect(result.current.data).toEqual({ id: 'user-1', username: 'leandrobfd', role: 'admin' })
  })

  it('nao executa a query quando nao ha userId', () => {
    const { result } = renderHook(() => useProfile(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — módulo `./useProfile` não existe.

- [ ] **Step 3: Implementar**

`src/features/profiles/useProfile.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Tables<'profiles'>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single()

      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adiciona useProfile para saber o papel do usuario logado"
```

---

### Task 4: `useUsers` — listar todos os usuários (só retorna dados reais para admin)

**Files:**
- Create: `src/features/profiles/useUsers.ts`, `src/features/profiles/useUsers.test.tsx`

- [ ] **Step 1: Escrever o teste**

`src/features/profiles/useUsers.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUsers } from './useUsers'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUsers', () => {
  it('lista todos os perfis ordenados por username', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'user-1', username: 'ana', role: 'user' },
        { id: 'user-2', username: 'leandrobfd', role: 'admin' },
      ],
      error: null,
    })
    const select = vi.fn(() => ({ order }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(order).toHaveBeenCalledWith('username', { ascending: true })
    expect(result.current.data).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — módulo `./useUsers` não existe.

- [ ] **Step 3: Implementar**

`src/features/profiles/useUsers.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<Tables<'profiles'>[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true })

      if (error) throw error
      return data
    },
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adiciona useUsers para listar todos os perfis"
```

---

### Task 5: `useSetUserRole` — promover/rebaixar via RPC

**Files:**
- Create: `src/features/profiles/useSetUserRole.ts`, `src/features/profiles/useSetUserRole.test.tsx`

- [ ] **Step 1: Escrever o teste**

`src/features/profiles/useSetUserRole.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useSetUserRole } from './useSetUserRole'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSetUserRole', () => {
  it('chama a RPC set_user_role com os parametros corretos', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    const { result } = renderHook(() => useSetUserRole(), { wrapper: createWrapper() })
    result.current.mutate({ targetUserId: 'user-1', newRole: 'admin' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.rpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'user-1',
      new_role: 'admin',
    })
  })

  it('propaga erro quando a RPC falha', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'not authorized' },
    } as never)

    const { result } = renderHook(() => useSetUserRole(), { wrapper: createWrapper() })
    result.current.mutate({ targetUserId: 'user-1', newRole: 'admin' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — módulo `./useSetUserRole` não existe.

- [ ] **Step 3: Implementar**

`src/features/profiles/useSetUserRole.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSetUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      targetUserId,
      newRole,
    }: {
      targetUserId: string
      newRole: 'user' | 'admin'
    }) => {
      const { error } = await supabase.rpc('set_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adiciona useSetUserRole (promover/rebaixar via RPC)"
```

---

### Task 6: `usePages` — modo "todas as páginas" para admin

**Files:**
- Modify: `src/features/pages/usePages.ts`, `src/features/pages/usePages.test.tsx`

- [ ] **Step 1: Atualizar o teste (falhando para o novo comportamento)**

Substituir o conteúdo de `src/features/pages/usePages.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { usePages } from './usePages'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function setupSupabaseMock(result: { data?: unknown; error?: unknown }) {
  const order = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq, order }))
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return { select, eq, order }
}

describe('usePages', () => {
  it('busca as paginas do dono ordenadas por atualizacao', async () => {
    const { eq, order } = setupSupabaseMock({ data: [{ id: '1' }], error: null })

    const { result } = renderHook(() => usePages('owner-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('pages')
    expect(eq).toHaveBeenCalledWith('owner_id', 'owner-1')
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result.current.data).toEqual([{ id: '1' }])
  })

  it('nao executa a query quando nao ha ownerId', () => {
    const { result } = renderHook(() => usePages(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('busca todas as paginas sem filtrar por dono quando allPages e true', async () => {
    const { eq, order } = setupSupabaseMock({ data: [{ id: '1' }, { id: '2' }], error: null })

    const { result } = renderHook(() => usePages(undefined, { allPages: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eq).not.toHaveBeenCalled()
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que o novo teste falha**

```bash
npm test
```
Expected: FAIL no terceiro teste — `usePages` ainda não aceita um segundo argumento `{ allPages: true }`.

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `src/features/pages/usePages.ts` por:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Page = Tables<'pages'>

export function usePages(ownerId: string | undefined, options?: { allPages?: boolean }) {
  const allPages = options?.allPages ?? false

  return useQuery({
    queryKey: allPages ? ['pages', 'all'] : ['pages', ownerId],
    queryFn: async () => {
      const base = supabase.from('pages').select('*')
      const query = allPages ? base : base.eq('owner_id', ownerId as string)
      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: allPages || Boolean(ownerId),
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam (os dois testes antigos continuam passando sem alteração de comportamento).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: usePages aceita modo allPages para o admin ver todas as arvores"
```

---

### Task 7: `useAnalyticsSummary` — modo "todas as páginas" + `ownerId` no retorno

**Files:**
- Modify: `src/features/analytics/useAnalyticsSummary.ts`, `src/features/analytics/useAnalyticsSummary.test.tsx`

- [ ] **Step 1: Atualizar o teste (falhando para o novo comportamento)**

Substituir o conteúdo de `src/features/analytics/useAnalyticsSummary.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useAnalyticsSummary } from './useAnalyticsSummary'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function mockSupabaseTables({ pages, summary }: { pages: unknown[]; summary: unknown[] }) {
  const eq = vi.fn().mockResolvedValue({ data: pages, error: null })
  const pagesSelect = vi.fn(() => ({
    eq,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: pages, error: null }),
  }))

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'pages') {
      return { select: pagesSelect } as never
    }
    if (table === 'analytics_summary') {
      return { select: vi.fn().mockResolvedValue({ data: summary, error: null }) } as never
    }
    throw new Error(`unexpected table ${table}`)
  })

  return { eq }
}

describe('useAnalyticsSummary', () => {
  it('combina paginas do dono com o resumo de analytics, usando 0 quando nao ha eventos', async () => {
    mockSupabaseTables({
      pages: [
        { id: 'page-1', title: 'Loja', slug: 'loja', is_published: true, owner_id: 'owner-1' },
        {
          id: 'page-2',
          title: 'Rascunho',
          slug: 'rascunho',
          is_published: false,
          owner_id: 'owner-1',
        },
      ],
      summary: [{ page_id: 'page-1', total_views: 10, total_clicks: 4 }],
    })

    const { result } = renderHook(() => useAnalyticsSummary('owner-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([
      {
        pageId: 'page-1',
        title: 'Loja',
        slug: 'loja',
        isPublished: true,
        ownerId: 'owner-1',
        totalViews: 10,
        totalClicks: 4,
      },
      {
        pageId: 'page-2',
        title: 'Rascunho',
        slug: 'rascunho',
        isPublished: false,
        ownerId: 'owner-1',
        totalViews: 0,
        totalClicks: 0,
      },
    ])
  })

  it('nao executa a query quando nao ha ownerId', () => {
    const { result } = renderHook(() => useAnalyticsSummary(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('busca paginas de todos os donos quando allPages e true', async () => {
    const { eq } = mockSupabaseTables({
      pages: [
        { id: 'page-1', title: 'Loja', slug: 'loja', is_published: true, owner_id: 'owner-1' },
        { id: 'page-2', title: 'Outra', slug: 'outra', is_published: true, owner_id: 'owner-2' },
      ],
      summary: [],
    })

    const { result } = renderHook(() => useAnalyticsSummary(undefined, { allPages: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eq).not.toHaveBeenCalled()
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.map((page) => page.ownerId)).toEqual(['owner-1', 'owner-2'])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que os novos testes falham**

```bash
npm test
```
Expected: FAIL — `useAnalyticsSummary` ainda não aceita `{ allPages: true }` nem retorna `ownerId`.

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `src/features/analytics/useAnalyticsSummary.ts` por:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PageAnalytics = {
  pageId: string
  title: string
  slug: string
  isPublished: boolean
  ownerId: string
  totalViews: number
  totalClicks: number
}

export function useAnalyticsSummary(ownerId: string | undefined, options?: { allPages?: boolean }) {
  const allPages = options?.allPages ?? false

  return useQuery({
    queryKey: allPages ? ['analytics-summary', 'all'] : ['analytics-summary', ownerId],
    queryFn: async (): Promise<PageAnalytics[]> => {
      const pagesQuery = supabase.from('pages').select('id, title, slug, is_published, owner_id')
      const { data: pages, error: pagesError } = await (allPages
        ? pagesQuery
        : pagesQuery.eq('owner_id', ownerId as string))

      if (pagesError) throw pagesError

      const { data: summary, error: summaryError } = await supabase
        .from('analytics_summary')
        .select('*')

      if (summaryError) throw summaryError

      const summaryByPageId = new Map((summary ?? []).map((row) => [row.page_id, row]))

      return (pages ?? []).map((page) => {
        const row = summaryByPageId.get(page.id)
        return {
          pageId: page.id,
          title: page.title,
          slug: page.slug,
          isPublished: page.is_published,
          ownerId: page.owner_id,
          totalViews: row?.total_views ?? 0,
          totalClicks: row?.total_clicks ?? 0,
        }
      })
    },
    enabled: allPages || Boolean(ownerId),
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 5: Verificar que `AnalyticsPage.tsx` ainda compila**

```bash
npm run typecheck
```
Expected: exit 0 (o campo `ownerId` novo em `PageAnalytics` é aditivo, não deveria quebrar nada ainda — `AnalyticsPage` é atualizado na Task 9).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: useAnalyticsSummary aceita modo allPages e retorna ownerId"
```

---

### Task 8: `PagesListPage` — ver e indicar o dono de cada árvore no modo admin

**Files:**
- Modify: `src/routes/pages/PagesListPage.tsx`, `src/routes/pages/PagesListPage.test.tsx`

- [ ] **Step 1: Ler o teste atual para entender o padrão de mocks**

`src/routes/pages/PagesListPage.test.tsx` já mocka `useSession` e `usePages` diretamente (ver arquivo). Adicionar aos mocks existentes:

```tsx
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => ({ data: { role: 'user' }, isLoading: false }),
}))

vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: () => ({ data: [] }),
}))
```

(inserir junto aos outros `vi.mock` no topo do arquivo, antes do `import PagesListPage from './PagesListPage'`).

- [ ] **Step 2: Adicionar um teste novo para o modo admin**

Adicionar ao final do `describe('PagesListPage', ...)` existente (ajustar o nome do describe se for diferente — usar o que já existir no arquivo):

```tsx
describe('PagesListPage (modo admin)', () => {
  it('mostra o dono de cada arvore quando o usuario logado e admin', async () => {
    vi.mocked(await import('@/features/profiles/useProfile')).useProfile = vi.fn(() => ({
      data: { role: 'admin' },
      isLoading: false,
    })) as never
    vi.mocked(await import('@/features/profiles/useUsers')).useUsers = vi.fn(() => ({
      data: [
        { id: 'owner-1', username: 'leandrobfd' },
        { id: 'owner-2', username: 'ana' },
      ],
    })) as never
    usePagesMock.mockReturnValue({
      data: [
        {
          id: 'page-1',
          title: 'Minha Loja',
          slug: 'minha-loja',
          is_published: true,
          updated_at: '2026-07-10T00:00:00Z',
          owner_id: 'owner-2',
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderList()

    expect(await screen.findByText('por ana')).toBeInTheDocument()
  })
})
```

Nota: como o mock de `useProfile`/`useUsers` precisa mudar de valor entre testes (usuário básico vs. admin), troque os `vi.mock` estáticos do Passo 1 por versões com uma referência mutável, seguindo o mesmo padrão já usado no arquivo para `usePagesMock` (uma const `vi.fn()` no topo, referenciada dentro do factory do `vi.mock`):

```tsx
const useProfileMock = vi.fn(() => ({ data: { role: 'user' }, isLoading: false }))
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => useProfileMock(),
}))

const useUsersMock = vi.fn(() => ({ data: [] }))
vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: () => useUsersMock(),
}))
```

E o teste do modo admin passa a ser:

```tsx
it('mostra o dono de cada arvore quando o usuario logado e admin', async () => {
  useProfileMock.mockReturnValue({ data: { role: 'admin' }, isLoading: false })
  useUsersMock.mockReturnValue({
    data: [
      { id: 'owner-1', username: 'leandrobfd' },
      { id: 'owner-2', username: 'ana' },
    ],
  })
  usePagesMock.mockReturnValue({
    data: [
      {
        id: 'page-1',
        title: 'Minha Loja',
        slug: 'minha-loja',
        is_published: true,
        updated_at: '2026-07-10T00:00:00Z',
        owner_id: 'owner-2',
      },
    ],
    isLoading: false,
    isError: false,
  })

  renderList()

  expect(await screen.findByText('por ana')).toBeInTheDocument()
})
```

Adicionar um `beforeEach(() => { useProfileMock.mockReturnValue({ data: { role: 'user' }, isLoading: false }); useUsersMock.mockReturnValue({ data: [] }) })` no topo do `describe` principal para resetar entre os testes existentes (que assumem o comportamento padrão de usuário básico) — verificar se já existe um `beforeEach` no arquivo e, se sim, adicionar essas duas linhas dentro dele em vez de criar um novo.

- [ ] **Step 3: Rodar e confirmar que o novo teste falha**

```bash
npm test
```
Expected: FAIL — `PagesListPage` ainda não usa `useProfile`/`useUsers` nem mostra o dono.

- [ ] **Step 4: Implementar**

Em `src/routes/pages/PagesListPage.tsx`, adicionar aos imports (junto aos demais de `@/features/...`):

```tsx
import { useProfile } from '@/features/profiles/useProfile'
import { useUsers } from '@/features/profiles/useUsers'
```

Trocar:
```tsx
  const { session } = useSession()
  const { data: pages, isLoading, isError } = usePages(session?.user.id)
```
por:
```tsx
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const isAdmin = profile?.role === 'admin'
  const { data: pages, isLoading, isError } = usePages(session?.user.id, { allPages: isAdmin })
  const { data: users } = useUsers()
  const usernameByOwnerId = new Map((users ?? []).map((user) => [user.id, user.username]))
```

Trocar a descrição do cabeçalho:
```tsx
          <p className="text-sm text-muted-foreground">Gerencie todas as suas árvores de links.</p>
```
por:
```tsx
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Gerencie as árvores de todos os usuários.'
              : 'Gerencie todas as suas árvores de links.'}
          </p>
```

Trocar o bloco que renderiza título/slug de cada item da lista:
```tsx
                  <div className="flex min-w-0 flex-col">
                    <Link to={`/pages/${page.id}/edit`} className="truncate font-medium hover:underline">
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      /{page.slug} · Atualizado em {dateFormatter.format(new Date(page.updated_at))}
                    </span>
                  </div>
```
por:
```tsx
                  <div className="flex min-w-0 flex-col">
                    <Link to={`/pages/${page.id}/edit`} className="truncate font-medium hover:underline">
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      /{page.slug} · Atualizado em {dateFormatter.format(new Date(page.updated_at))}
                      {isAdmin && ` · por ${usernameByOwnerId.get(page.owner_id) ?? 'desconhecido'}`}
                    </span>
                  </div>
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam, incluindo os pré-existentes (que continuam no modo básico via `useProfileMock` padrão).

- [ ] **Step 6: Verificar build/lint**

```bash
npm run typecheck
npm run lint
npm run build
```
Expected: exit 0 nos três.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: PagesListPage mostra arvores de todos os usuarios e o dono de cada uma para admin"
```

---

### Task 9: `AnalyticsPage` — ver analytics de todos no modo admin

**Files:**
- Modify: `src/routes/analytics/AnalyticsPage.tsx`, `src/routes/analytics/AnalyticsPage.test.tsx`

- [ ] **Step 1: Ler `src/routes/analytics/AnalyticsPage.test.tsx` atual** para seguir o mesmo padrão de mocks de `useSession`/`useAnalyticsSummary` já usado nele.

- [ ] **Step 2: Adicionar os mocks de `useProfile`/`useUsers` e um teste do modo admin**

Seguir exatamente o mesmo padrão da Task 8 (Step 1/2): mocks com uma referência `vi.fn()` mutável para `useProfile`/`useUsers`, um `beforeEach` resetando para `{ role: 'user' }`/`{ data: [] }`, e um novo teste:

```tsx
it('mostra o dono de cada arvore no ranking quando o usuario logado e admin', async () => {
  useProfileMock.mockReturnValue({ data: { role: 'admin' }, isLoading: false })
  useUsersMock.mockReturnValue({
    data: [
      { id: 'owner-1', username: 'leandrobfd' },
      { id: 'owner-2', username: 'ana' },
    ],
  })
  useAnalyticsSummaryMock.mockReturnValue({
    data: [
      {
        pageId: 'page-1',
        title: 'Loja',
        slug: 'loja',
        isPublished: true,
        ownerId: 'owner-2',
        totalViews: 10,
        totalClicks: 4,
      },
    ],
    isLoading: false,
    isError: false,
  })

  render(<AnalyticsPage />)

  expect(await screen.findByText('por ana')).toBeInTheDocument()
})
```

(usar a mesma estrutura de `vi.mock`/const mutável já usada para `useAnalyticsSummary` no arquivo, nomeando a referência como `useAnalyticsSummaryMock` se ainda não existir com esse nome — ajustar a Step 4 de acordo com o nome real do mock já presente no arquivo).

- [ ] **Step 3: Rodar e confirmar que o novo teste falha**

```bash
npm test
```
Expected: FAIL — `AnalyticsPage` ainda não usa `useProfile`/`useUsers` nem mostra o dono.

- [ ] **Step 4: Implementar**

Em `src/routes/analytics/AnalyticsPage.tsx`, adicionar aos imports:

```tsx
import { useProfile } from '@/features/profiles/useProfile'
import { useUsers } from '@/features/profiles/useUsers'
```

Trocar:
```tsx
  const { session } = useSession()
  const { data: pagesAnalytics, isLoading, isError } = useAnalyticsSummary(session?.user.id)
```
por:
```tsx
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const isAdmin = profile?.role === 'admin'
  const { data: pagesAnalytics, isLoading, isError } = useAnalyticsSummary(session?.user.id, {
    allPages: isAdmin,
  })
  const { data: users } = useUsers()
  const usernameByOwnerId = new Map((users ?? []).map((user) => [user.id, user.username]))
```

Trocar a descrição do cabeçalho:
```tsx
        <p className="text-sm text-muted-foreground">
          Visualizações e cliques registrados em todas as suas árvores.
        </p>
```
por:
```tsx
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Visualizações e cliques registrados em todas as árvores de todos os usuários.'
            : 'Visualizações e cliques registrados em todas as suas árvores.'}
        </p>
```

Trocar o bloco de título/slug de cada linha do ranking:
```tsx
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/pages/${page.pageId}/edit`}
                      className="truncate font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">/{page.slug}</span>
                  </div>
```
por:
```tsx
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/pages/${page.pageId}/edit`}
                      className="truncate font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      /{page.slug}
                      {isAdmin && ` · por ${usernameByOwnerId.get(page.ownerId) ?? 'desconhecido'}`}
                    </span>
                  </div>
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 6: Verificar build/lint**

```bash
npm run typecheck
npm run lint
npm run build
```
Expected: exit 0 nos três.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: AnalyticsPage mostra analytics de todos os usuarios e o dono de cada arvore para admin"
```

---

### Task 10: `SettingsPage` — seção "Usuários" (promover/rebaixar)

**Files:**
- Modify: `src/routes/settings/SettingsPage.tsx`
- Create: `src/routes/settings/SettingsPage.test.tsx`

- [ ] **Step 1: Escrever o teste**

`src/routes/settings/SettingsPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'admin-1' } }, isLoading: false, error: null }),
}))

const useProfileMock = vi.fn(() => ({ data: { role: 'user' }, isLoading: false }))
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => useProfileMock(),
}))

const useUsersMock = vi.fn(() => ({ data: [] }))
vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: () => useUsersMock(),
}))

const setRoleMutate = vi.fn()
vi.mock('@/features/profiles/useSetUserRole', () => ({
  useSetUserRole: () => ({ mutate: setRoleMutate }),
}))

import SettingsPage from './SettingsPage'

beforeEach(() => {
  useProfileMock.mockReturnValue({ data: { role: 'user' }, isLoading: false })
  useUsersMock.mockReturnValue({ data: [] })
  setRoleMutate.mockClear()
})

describe('SettingsPage', () => {
  it('nao mostra a secao de usuarios para quem nao e admin', () => {
    render(<SettingsPage />)
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
  })

  it('mostra a lista de usuarios para admin, com o papel de cada um', () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-1', username: 'ana', role: 'user' },
      ],
    })

    render(<SettingsPage />)

    expect(screen.getByText('Usuários')).toBeInTheDocument()
    expect(screen.getByText('leandrobfd')).toBeInTheDocument()
    expect(screen.getByText('ana')).toBeInTheDocument()
  })

  it('desabilita o controle de papel na propria linha do admin logado', () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-1', username: 'ana', role: 'user' },
      ],
    })

    render(<SettingsPage />)

    const switches = screen.getAllByRole('switch')
    const ownSwitch = switches.find((element) =>
      element.getAttribute('aria-label')?.includes('leandrobfd'),
    )
    expect(ownSwitch).toBeDisabled()
  })

  it('promove um usuario basico direto, sem confirmacao', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [{ id: 'user-1', username: 'ana', role: 'user' }],
    })

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('switch', { name: /ana/i }))

    expect(setRoleMutate).toHaveBeenCalledWith({ targetUserId: 'user-1', newRole: 'admin' })
  })

  it('pede confirmacao antes de rebaixar um admin', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-2', username: 'outro-admin', role: 'admin' },
      ],
    })

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('switch', { name: /outro-admin/i }))

    expect(setRoleMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /rebaixar/i }))

    expect(setRoleMutate).toHaveBeenCalledWith({ targetUserId: 'user-2', newRole: 'user' })
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — `SettingsPage` ainda é só um placeholder, sem a seção de usuários.

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `src/routes/settings/SettingsPage.tsx` por:

```tsx
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSession } from '@/features/auth/useSession'
import { useProfile } from '@/features/profiles/useProfile'
import { useUsers } from '@/features/profiles/useUsers'
import { useSetUserRole, type Role } from '@/features/profiles/useSetUserRole'
import type { Tables } from '@/lib/database.types'

type ProfileRow = Tables<'profiles'>

export default function SettingsPage() {
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      {isAdmin && <UsersSection currentUserId={session?.user.id} />}
    </div>
  )
}

function UsersSection({ currentUserId }: { currentUserId: string | undefined }) {
  const { data: users } = useUsers()
  const setUserRole = useSetUserRole()
  const [userToDemote, setUserToDemote] = useState<ProfileRow | null>(null)

  function handleToggle(user: ProfileRow, checked: boolean) {
    if (checked) {
      setUserRole.mutate({ targetUserId: user.id, newRole: 'admin' })
      return
    }
    setUserToDemote(user)
  }

  function handleConfirmDemote() {
    if (!userToDemote) return
    setUserRole.mutate({ targetUserId: userToDemote.id, newRole: 'user' as Role })
    setUserToDemote(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Promova ou rebaixe o acesso de cada funcionário.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {(users ?? []).map((user) => {
            const isCurrentUser = user.id === currentUserId
            return (
              <li key={user.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{user.username}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Básico'}
                  </Badge>
                  <Switch
                    checked={user.role === 'admin'}
                    onCheckedChange={(checked) => handleToggle(user, checked)}
                    disabled={isCurrentUser}
                    aria-label={
                      user.role === 'admin'
                        ? `Rebaixar ${user.username} para básico`
                        : `Promover ${user.username} para admin`
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>

      <AlertDialog
        open={userToDemote !== null}
        onOpenChange={(open) => !open && setUserToDemote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebaixar administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de admin de &quot;{userToDemote?.username}
              &quot;? A pessoa passa a ver e editar só as próprias árvores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDemote}>Rebaixar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
```

Também exportar o tipo `Role` de `src/features/profiles/useSetUserRole.ts` (usado acima). Editar esse arquivo (criado na Task 5) adicionando, antes de `export function useSetUserRole()`:

```ts
export type Role = 'user' | 'admin'
```

E trocar a assinatura de `mutationFn` para usar esse tipo em vez do literal inline:

```ts
    mutationFn: async ({
      targetUserId,
      newRole,
    }: {
      targetUserId: string
      newRole: Role
    }) => {
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```
Expected: todos os testes passam.

- [ ] **Step 5: Verificar build/lint**

```bash
npm run typecheck
npm run lint
npm run build
```
Expected: exit 0 nos três.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: adiciona secao de usuarios em Configuracoes para promover/rebaixar admin"
```

---

### Task 11: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Documentar a feature**

Adicionar uma linha em "Project status" (seguindo o padrão das entradas anteriores, com a data de hoje) descrevendo: papel `admin`/`user` em `profiles.role`, RLS admin-all/admin-select via `is_admin()`, RPC `set_user_role` como único caminho para mudar o papel (coluna protegida por `REVOKE UPDATE`), e a seção "Usuários" em Configurações. Mencionar o primeiro admin (`leandro-bfd@aponti.org.br`) e que outros admins só podem ser promovidos por quem já é admin, pela própria UI.

Atualizar a seção "Domain model" para incluir a coluna `role` e as novas policies/RPC na lista de padrões de RLS.

Atualizar "Screens / feature surface" — trocar a descrição de `SettingsPage` de "placeholder" para o comportamento real.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com os papeis de usuario (admin/basico)"
```

---

### Task 12: Push da branch e abertura do PR para `develop`

- [ ] **Step 1: Push**

```bash
git push -u origin feature/admin-user-roles
```

- [ ] **Step 2: Abrir o PR**

```bash
gh pr create \
  --repo apontiacademy/arvoreAponti-pe-aponti26dev \
  --base develop \
  --head feature/admin-user-roles \
  --title "feat: papeis de usuario (admin/basico)" \
  --body "Adiciona o papel admin (ve e gerencia arvores/links/analytics de qualquer usuario) e mantem o nivel basico atual. RLS via is_admin() + policies *_admin_all/*_admin_select; unica forma de alterar o papel e a RPC set_user_role (coluna role protegida por REVOKE). Nova secao 'Usuarios' em Configuracoes para promover/rebaixar. Primeiro admin: leandro-bfd@aponti.org.br."
```

- [ ] **Step 3: Conferir CI**

```bash
gh pr checks feature/admin-user-roles --repo apontiacademy/arvoreAponti-pe-aponti26dev
```
Expected: todos os checks passam. Se algum falhar, corrigir na própria branch, commitar e repetir.

---

## Self-Review (preenchido após escrever o plano)

- **Cobertura do spec:** modelo de dados (Task 1), bootstrap do primeiro admin + tipos (Task 2), `useProfile`/`useUsers`/`useSetUserRole` (Tasks 3-5), `usePages`/`useAnalyticsSummary` admin-aware (Tasks 6-7), `PagesListPage`/`AnalyticsPage` com indicação de dono (Tasks 8-9), seção de usuários em Configurações com confirmação e auto-proteção (Task 10), documentação (Task 11), PR (Task 12). Todo item do "Entra" do spec tem uma task correspondente.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todas as etapas têm SQL/código/comando completo. As Tasks 8-9 pedem para ler o arquivo de teste existente antes de editar porque o nome exato de algumas variáveis de mock (`describe` já existente, nome do mock de `useAnalyticsSummary`) depende do conteúdo atual do arquivo, que o executor deve conferir — isso é orientação de onde encaixar o código dado, não um placeholder de conteúdo.
- **Consistência de tipos:** `useSetUserRole` usa `{ targetUserId, newRole }` (camelCase) e traduz para `{ target_user_id, new_role }` na chamada da RPC — mesmo formato em todos os pontos que o consomem (Task 5 e Task 10). `usePages`/`useAnalyticsSummary` usam a mesma forma `options?: { allPages?: boolean }` nas duas hooks. `PageAnalytics.ownerId` (Task 7) é o campo usado em `AnalyticsPage` (Task 9); `Page.owner_id` (coluna real da tabela) é o campo usado em `PagesListPage` (Task 8) — nomes diferentes intencionalmente, um vem de um tipo mapeado (`useAnalyticsSummary`) e o outro é a linha bruta da tabela (`usePages`).
