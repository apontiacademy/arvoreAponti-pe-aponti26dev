# Fase 1 — Fundação do ApontiLinkCenter — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o repositório `apontiacademy/arvoreAponti-pe-aponti26dev` publicado com gitflow (`main`/`staging`/`develop`), o scaffold Vite+React+TS+Tailwind v4+shadcn/ui funcionando, rotas base protegidas por Supabase Auth, schema Supabase inicial com RLS, e CI rodando lint/typecheck/test/build em PRs.

**Architecture:** Scaffold gerado pela ferramenta oficial (`npm create vite@latest`) em diretório temporário e mesclado no repo (evita divergência de config em relação à versão atual da toolchain). Lógica de auth isolada em `features/auth` com TDD (Vitest + Testing Library). Schema Supabase criado via MCP (projeto novo na org "Aponti") com migração SQL versionada em `supabase/migrations`.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, React Router v6 (data router), TanStack Query, Supabase JS, Vitest, @testing-library/react, GitHub Actions.

---

## Referências

- Spec: `docs/superpowers/specs/2026-07-15-fundacao-projeto-design.md`
- Briefing original: `prompt.MD`
- Guia de contexto: `CLAUDE.md`

## Pré-condições verificadas

- `git`, `gh` (autenticado como `leandrucarvalho`, com escopo `repo`), `node` v26.1.0, `npm` 11.13.0 disponíveis.
- Repositório local já inicializado (`git init -b main`) com 1 commit (`prompt.MD`, `CLAUDE.md`, spec da Fase 1).
- Repositório remoto `apontiacademy/arvoreAponti-pe-aponti26dev` existe, vazio, privado.
- Org Supabase disponível via MCP: `Aponti` (id `fbmkamyfhgsanetxihvl`).

---

### Task 1: Repositório remoto & branches gitflow

**Files:** nenhum arquivo de código; apenas operações git/GitHub.

- [ ] **Step 1: Adicionar remote e enviar `main`**

```bash
cd "/c/Users/leo-s/Documents/Projetos BFD - Aponti/ApontiLinkCenter"
git remote add origin https://github.com/apontiacademy/arvoreAponti-pe-aponti26dev.git
git push -u origin main
```
Expected: push cria a branch `main` no remoto com o commit já existente.

- [ ] **Step 2: Criar e enviar `develop` e `staging` a partir de `main`**

```bash
git branch develop main
git push -u origin develop
git branch staging main
git push -u origin staging
```
Expected: três branches (`main`, `develop`, `staging`) visíveis em `gh repo view apontiacademy/arvoreAponti-pe-aponti26dev --json defaultBranchRef` / `git ls-remote origin`.

- [ ] **Step 3: Definir `main` como branch padrão do repo**

```bash
gh repo edit apontiacademy/arvoreAponti-pe-aponti26dev --default-branch main
```
Expected: `defaultBranchRef.name` volta `"main"` em `gh repo view ... --json defaultBranchRef`.

- [ ] **Step 4: Proteger `main` e `staging` (exigir PR, sem push direto)**

```bash
for BR in main staging; do
cat <<'EOF' | gh api --method PUT "repos/apontiacademy/arvoreAponti-pe-aponti26dev/branches/$BR/protection" --input -
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
EOF
done
```
Expected: `200 OK` para cada branch. Se vier `403`/`404` (permissão de admin insuficiente no org), pule esta etapa, avise o usuário no resumo final e siga com o resto do plano — não é bloqueante.

- [ ] **Step 5: Criar branch de feature para o restante da Fase 1**

```bash
git checkout -b feature/fase-1-fundacao develop
```
Expected: `git status` mostra `On branch feature/fase-1-fundacao`. Todos os commits das Tasks 2–10 acontecem nesta branch.

---

### Task 2: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`, `eslint.config.js` (todos gerados pela ferramenta oficial)
- Modify: `package.json` (name), `index.html` (title)

- [ ] **Step 1: Gerar o scaffold em diretório temporário**

```bash
cd "/c/Users/leo-s/Documents/Projetos BFD - Aponti/ApontiLinkCenter"
npm create vite@latest .vite-scaffold -- --template react-ts
```
Expected: diretório `.vite-scaffold/` criado com `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/`, `.gitignore`, `eslint.config.js`.

- [ ] **Step 2: Mesclar o scaffold na raiz do repo e remover o temporário**

```bash
cp -r .vite-scaffold/. .
rm -rf .vite-scaffold
```
Expected: `git status` mostra os novos arquivos como untracked; `prompt.MD`, `CLAUDE.md`, `docs/` continuam intactos.

- [ ] **Step 3: Instalar dependências**

```bash
npm install
```
Expected: `node_modules/` criado, `package-lock.json` gerado, sem erros.

- [ ] **Step 4: Ajustar nome do pacote e título da página**

Editar `package.json`: campo `"name"` para `"apontilinkcenter"`.
Editar `index.html`: `<title>` para `ApontiLinkCenter`.

- [ ] **Step 5: Verificar lint, typecheck e build**

```bash
npm run lint
npm run build
```
Expected: ambos saem com exit code 0; `dist/` criado pelo build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + typescript"
```

---

### Task 3: Vitest + Testing Library

**Files:**
- Create: `src/test/setup.ts`, `src/test/smoke.test.ts`
- Modify: `vite.config.ts`, `package.json` (script `test`)

- [ ] **Step 1: Instalar dependências de teste**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Configurar Vitest no `vite.config.ts`**

Conteúdo final do arquivo:

```ts
import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

(O plugin do Tailwind entra na Task 4 — não remover o que foi escrito aqui.)

- [ ] **Step 3: Criar `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Adicionar alias `@/*` no `tsconfig.app.json`**

Dentro de `compilerOptions`, adicionar:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 5: Adicionar script `test` no `package.json`**

```json
"test": "vitest run"
```

- [ ] **Step 6: Escrever teste de fumaça (falhando por não existir configuração ainda seria redundante aqui — este teste serve para provar que o runner está funcionando)**

`src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('test runner', () => {
  it('executa um teste simples', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7: Rodar e confirmar**

```bash
npm test
```
Expected: `1 passed`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: configura vitest e testing library"
```

---

### Task 4: Tailwind CSS v4 + shadcn/ui

**Files:**
- Modify: `vite.config.ts`, `src/index.css`
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx` (gerados pelo shadcn CLI)

- [ ] **Step 1: Instalar Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Adicionar o plugin do Tailwind ao `vite.config.ts`**

```ts
import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 3: Substituir o conteúdo de `src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Inicializar shadcn/ui**

```bash
npx shadcn@latest init -y -d
```
Se o CLI pedir confirmação interativa mesmo com essas flags, responder: TypeScript = sim, estilo = "new-york", cor base = "neutral", CSS variables = sim, alias de componentes = `@/components`, alias de utils = `@/lib/utils`.

Expected: cria `components.json`, `src/lib/utils.ts`, ajusta `src/index.css` (mantém o `@import "tailwindcss"` e adiciona variáveis de tema).

- [ ] **Step 5: Adicionar um componente para validar a integração**

```bash
npx shadcn@latest add button -y
```
Expected: `src/components/ui/button.tsx` criado.

- [ ] **Step 6: Verificar build**

```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configura tailwind v4 e shadcn/ui"
```

---

### Task 5: Cliente Supabase & variáveis de ambiente

**Files:**
- Create: `src/lib/supabase.ts`, `.env.example`
- Modify: `.gitignore` (garantir `.env*.local` e `.env` ignorados)

- [ ] **Step 1: Instalar o SDK do Supabase**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Criar `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Garantir que `.env` não seja versionado**

Conferir/adicionar em `.gitignore`:

```
.env
.env.local
```

- [ ] **Step 4: Criar `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adiciona cliente supabase e variaveis de ambiente"
```

---

### Task 6: `useSession` + `AuthGuard` (TDD)

**Files:**
- Create: `src/features/auth/useSession.ts`, `src/features/auth/AuthGuard.tsx`, `src/features/auth/AuthGuard.test.tsx`
- Modify: `package.json` (dependência `react-router-dom`, adicionada aqui pois é a primeira a usá-la)

- [ ] **Step 1: Instalar React Router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Escrever o teste falhando**

`src/features/auth/AuthGuard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { AuthGuard } from './AuthGuard'

function renderWithRouter(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<div>tela protegida</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthGuard', () => {
  it('redireciona para /login quando nao ha sessao', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)

    renderWithRouter(['/dashboard'])

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('renderiza a rota protegida quando ha sessao', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    } as never)

    renderWithRouter(['/dashboard'])

    expect(await screen.findByText('tela protegida')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — `Cannot find module './AuthGuard'` (ou equivalente).

- [ ] **Step 4: Implementar `useSession`**

`src/features/auth/useSession.ts`:

```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, isLoading }
}
```

- [ ] **Step 5: Implementar `AuthGuard`**

`src/features/auth/AuthGuard.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './useSession'

export function AuthGuard() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return <div role="status">Carregando...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npm test
```
Expected: `2 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: adiciona useSession e AuthGuard com testes"
```

---

### Task 7: `AppLayout` (Sidebar, Topbar, Breadcrumb)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/Breadcrumb.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/AppLayout.test.tsx`

- [ ] **Step 1: Escrever teste de fumaça do layout**

`src/components/layout/AppLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renderiza sidebar, topbar e o conteudo da rota filha', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>conteudo do dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('conteudo do dashboard')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```
Expected: FAIL — módulo `./AppLayout` não existe.

- [ ] **Step 3: Implementar os componentes**

`src/components/layout/Sidebar.tsx`:

```tsx
export function Sidebar() {
  return (
    <nav aria-label="Navegação principal" className="w-60 shrink-0 border-r p-4">
      <span className="font-semibold">ApontiLinkCenter</span>
    </nav>
  )
}
```

`src/components/layout/Topbar.tsx`:

```tsx
export function Topbar() {
  return (
    <header className="flex h-14 items-center border-b px-4">
      <span>Topbar</span>
    </header>
  )
}
```

`src/components/layout/Breadcrumb.tsx`:

```tsx
export function Breadcrumb() {
  return <div className="px-4 py-2 text-sm text-muted-foreground">Breadcrumb</div>
}
```

`src/components/layout/AppLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Breadcrumb } from './Breadcrumb'

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <Breadcrumb />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
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
git commit -m "feat: adiciona AppLayout com sidebar, topbar e breadcrumb"
```

---

### Task 8: Rotas base com lazy loading

**Files:**
- Create: `src/routes/login/LoginPage.tsx`, `src/routes/dashboard/DashboardPage.tsx`, `src/routes/pages/PagesListPage.tsx`, `src/routes/pages/PageNewPage.tsx`, `src/routes/pages/PageEditPage.tsx`, `src/routes/analytics/AnalyticsPage.tsx`, `src/routes/profile/ProfilePage.tsx`, `src/routes/settings/SettingsPage.tsx`, `src/routes/public/PublicPagePage.tsx`, `src/routes/not-found/NotFoundPage.tsx`, `src/routes/router.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar as páginas placeholder**

Cada arquivo segue o mesmo padrão, por exemplo `src/routes/dashboard/DashboardPage.tsx`:

```tsx
export default function DashboardPage() {
  return <h1 className="text-xl font-semibold">Dashboard</h1>
}
```

Repetir para `LoginPage` ("Login"), `PagesListPage` ("Lista de Árvores"), `PageNewPage` ("Criar Árvore"), `PageEditPage` ("Editar Árvore"), `AnalyticsPage` ("Analytics"), `ProfilePage` ("Perfil"), `SettingsPage` ("Configurações"), `PublicPagePage` ("Página Pública"), `NotFoundPage` ("404 — Página não encontrada").

- [ ] **Step 2: Criar `src/routes/router.tsx` com lazy loading e o `AuthGuard`**

```tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/features/auth/AuthGuard'

const LoginPage = lazy(() => import('./login/LoginPage'))
const DashboardPage = lazy(() => import('./dashboard/DashboardPage'))
const PagesListPage = lazy(() => import('./pages/PagesListPage'))
const PageNewPage = lazy(() => import('./pages/PageNewPage'))
const PageEditPage = lazy(() => import('./pages/PageEditPage'))
const AnalyticsPage = lazy(() => import('./analytics/AnalyticsPage'))
const ProfilePage = lazy(() => import('./profile/ProfilePage'))
const SettingsPage = lazy(() => import('./settings/SettingsPage'))
const PublicPagePage = lazy(() => import('./public/PublicPagePage'))
const NotFoundPage = lazy(() => import('./not-found/NotFoundPage'))

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<div role="status">Carregando...</div>}>{element}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/:username', element: withSuspense(<PublicPagePage />) },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/pages', element: withSuspense(<PagesListPage />) },
          { path: '/pages/new', element: withSuspense(<PageNewPage />) },
          { path: '/pages/:id/edit', element: withSuspense(<PageEditPage />) },
          { path: '/analytics', element: withSuspense(<AnalyticsPage />) },
          { path: '/profile', element: withSuspense(<ProfilePage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
])
```

- [ ] **Step 3: Atualizar `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'

function App() {
  return <RouterProvider router={router} />
}

export default App
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
npm run lint
```
Expected: exit code 0 nos dois.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adiciona rotas base com lazy loading e paginas placeholder"
```

---

### Task 9: Schema Supabase (migrations + RLS) via MCP

**Files:**
- Create: `supabase/migrations/20260715000000_initial_schema.sql`

- [ ] **Step 1: Criar o projeto Supabase**

Via MCP (`mcp__claude_ai_Supabase__create_project`): organização `fbmkamyfhgsanetxihvl` ("Aponti"), nome `arvore-aponti`, região `sa-east-1`.
Expected: retorno com `id`/`ref` do novo projeto — guardar para os próximos passos.

- [ ] **Step 2: Escrever a migração inicial**

`supabase/migrations/20260715000000_initial_schema.sql`:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table themes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  base_settings jsonb not null default '{}'::jsonb
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  is_published boolean not null default false,
  theme_id uuid references themes(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pages_owner_id_idx on pages(owner_id);

create table links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null check (type in (
    'title','text','link','whatsapp','instagram','tiktok','telegram',
    'youtube','spotify','pix','email','phone','image','video'
  )),
  "order" integer not null default 0,
  label text,
  url text,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);
create index links_page_id_idx on links(page_id);

create table social_links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  platform text not null,
  url text not null,
  "order" integer not null default 0
);
create index social_links_page_id_idx on social_links(page_id);

create table analytics (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  link_id uuid references links(id) on delete cascade,
  event_type text not null check (event_type in ('view','click')),
  device text,
  os text,
  browser text,
  referrer text,
  created_at timestamptz not null default now()
);
create index analytics_page_created_idx on analytics(page_id, created_at);
create index analytics_link_created_idx on analytics(link_id, created_at);

create view analytics_summary as
select
  page_id,
  count(*) filter (where event_type = 'view') as total_views,
  count(*) filter (where event_type = 'click') as total_clicks
from analytics
group by page_id;

alter table profiles enable row level security;
alter table pages enable row level security;
alter table links enable row level security;
alter table social_links enable row level security;
alter table themes enable row level security;
alter table analytics enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "pages_owner_all" on pages for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "pages_public_select_published" on pages for select using (is_published = true);

create policy "links_owner_all" on links for all using (
  auth.uid() = (select owner_id from pages where pages.id = links.page_id)
) with check (
  auth.uid() = (select owner_id from pages where pages.id = links.page_id)
);
create policy "links_public_select_published" on links for select using (
  is_active = true and exists (select 1 from pages where pages.id = links.page_id and pages.is_published = true)
);

create policy "social_links_owner_all" on social_links for all using (
  auth.uid() = (select owner_id from pages where pages.id = social_links.page_id)
) with check (
  auth.uid() = (select owner_id from pages where pages.id = social_links.page_id)
);
create policy "social_links_public_select_published" on social_links for select using (
  exists (select 1 from pages where pages.id = social_links.page_id and pages.is_published = true)
);

create policy "themes_public_read" on themes for select using (true);

create policy "analytics_owner_select" on analytics for select using (
  auth.uid() = (select owner_id from pages where pages.id = analytics.page_id)
);
create policy "analytics_public_insert" on analytics for insert with check (true);

insert into themes (slug, name) values
  ('minimal', 'Minimal'),
  ('dark', 'Dark'),
  ('glass', 'Glass'),
  ('corporate', 'Corporate'),
  ('modern', 'Modern');
```

- [ ] **Step 3: Aplicar a migração no projeto criado**

Via MCP (`mcp__claude_ai_Supabase__apply_migration`), usando o `project_id` da Step 1, `name: "initial_schema"` e o SQL acima.
Expected: retorno de sucesso, sem erros de sintaxe/constraint.

- [ ] **Step 4: Conferir tabelas e políticas**

Via MCP (`mcp__claude_ai_Supabase__list_tables`) no projeto criado.
Expected: `profiles`, `themes`, `pages`, `links`, `social_links`, `analytics` presentes, todas com RLS habilitado.

- [ ] **Step 5: Buscar URL e chave pública e preencher `.env` local (não versionado)**

Via MCP (`mcp__claude_ai_Supabase__get_project_url` e `mcp__claude_ai_Supabase__get_publishable_keys`), copiar `.env.example` para `.env` e preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
Expected: `.env` existe localmente e **não aparece** em `git status` (coberto pelo `.gitignore` da Task 5).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260715000000_initial_schema.sql
git commit -m "feat: adiciona schema inicial do supabase com RLS"
```

---

### Task 10: CI (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar o workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [develop, staging, main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Adicionar script `typecheck` no `package.json`** (se ainda não existir)

```json
"typecheck": "tsc -b --noEmit"
```

- [ ] **Step 3: Rodar localmente os mesmos passos do CI**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
Expected: os quatro comandos saem com exit code 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: adiciona workflow de lint, typecheck, test e build"
```

---

### Task 11: Push da feature branch e abertura do PR para `develop`

- [ ] **Step 1: Push da branch**

```bash
git push -u origin feature/fase-1-fundacao
```

- [ ] **Step 2: Abrir o PR**

```bash
gh pr create \
  --base develop \
  --head feature/fase-1-fundacao \
  --title "Fase 1: fundacao do projeto (scaffold, auth guard, rotas, schema supabase, CI)" \
  --body "Implementa a Fase 1 do plano em docs/superpowers/plans/2026-07-15-fase-1-fundacao.md: scaffold Vite+React+TS+Tailwind v4+shadcn/ui, AuthGuard com Supabase Auth (TDD), rotas base com lazy loading, schema Supabase inicial com RLS, e CI (lint/typecheck/test/build)."
```
Expected: PR criado apontando `feature/fase-1-fundacao` → `develop`; CI dispara automaticamente.

- [ ] **Step 3: Conferir o status do CI no PR**

```bash
gh pr checks feature/fase-1-fundacao
```
Expected: todos os checks passam (`pass`). Se algum falhar, corrigir na própria branch, commitar e repetir.

---

## Self-Review (preenchido após escrever o plano)

- **Cobertura do spec:** Repositório/gitflow (Task 1), scaffold (Task 2), estrutura de pastas (Tasks 2–8 populam `src/app` via `App.tsx`, `routes/`, `components/`, `features/`, `lib/`), schema Supabase (Task 9), rotas base (Task 8), CI/Vercel (Task 10 cobre CI; Vercel fica fora do escopo desta fase por depender de conexão manual do usuário ao projeto Vercel — deixar explícito no resumo final).
- **Placeholders:** nenhum "TBD"/"implementar depois" — toda etapa tem comando ou código completo.
- **Consistência de tipos:** `AuthGuard` consome `useSession` (mesmo nome/retorno `{ session, isLoading }`) usado depois em `router.tsx`; `supabase` client importado de `@/lib/supabase` em todos os pontos que o usam.

---

## Adendo pós-implementação (2026-07-15) — revisão final do branch inteiro

Após a Task 11 (PR #1 aberto, CI verde), uma revisão final de todo o branch identificou gaps entre o spec aprovado e o que foi entregue: `TanStack Query` estava no "Entra" do spec (`docs/superpowers/specs/2026-07-15-fundacao-projeto-design.md`) mas nunca foi instalado/plugado; `CLAUDE.md` ficou desatualizado; `README.md` seguiu o padrão do Vite; este próprio arquivo de plano nunca tinha sido commitado; e os Supabase Advisors de performance (`auth_rls_initplan`, FK sem índice) apontaram melhorias baratas de fazer agora. O usuário optou por corrigir tudo antes do merge. As três tarefas abaixo fecham esses gaps.

### Task 12: TanStack Query + camada de providers

**Files:**
- Create: `src/app/providers.tsx`
- Modify: `src/App.tsx`, `package.json`

- [ ] **Step 1: Instalar o TanStack Query**

```bash
npm install @tanstack/react-query
```

- [ ] **Step 2: Criar `src/app/providers.tsx`**

```tsx
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Nota de escopo: o spec original previa `src/app/` para `main.tsx`, `App.tsx` e providers. Esta tarefa cria `src/app/` apenas com `providers.tsx` — `main.tsx`/`App.tsx` permanecem na raiz de `src/` (padrão já estabelecido nas Tasks 2 e 8), já que mover o entrypoint do Vite é uma mudança estrutural de maior risco e sem benefício real neste estágio. Não mover `main.tsx`/`App.tsx` sem discutir antes.

- [ ] **Step 3: Envolver o router com `AppProviders` em `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { AppProviders } from './app/providers'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
```

- [ ] **Step 4: Escrever um teste de fumaça confirmando que a árvore renderiza com o provider**

`src/app/providers.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { AppProviders } from './providers'

function Probe() {
  const client = useQueryClient()
  return <div>{client ? 'query client disponivel' : 'sem query client'}</div>
}

describe('AppProviders', () => {
  it('disponibiliza um QueryClient para os componentes filhos', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    expect(screen.getByText('query client disponivel')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Verificar**

```bash
npm test
npm run build
npm run lint
```
Expected: os três saem com exit code 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: adiciona TanStack Query e camada de providers em src/app"
```

---

### Task 13: Corrigir Supabase Advisors de performance (RLS)

**Files:**
- Create: `supabase/migrations/20260715000002_rls_performance.sql`

Contexto: `mcp__claude_ai_Supabase__get_advisors` (tipo performance) no projeto `evkmyrozkpqehunnlbif` aponta: (1) `auth_rls_initplan` — `auth.uid()` sem subselect nas policies de `profiles`, `pages`, `links`, `social_links`, `analytics` faz o Postgres reavaliar a função por linha em vez de uma vez por query; (2) FK `pages.theme_id` sem índice. As políticas duplicadas (`*_owner_all` + `*_public_select_published`) em `pages`/`links`/`social_links` **não devem ser fundidas** — são regras de acesso genuinamente diferentes (dono vs. público) e uni-las arriscaria enfraquecer a proteção de escrita; o advisor as sinaliza como informativo, não como bug.

- [ ] **Step 1: Escrever a migração**

`supabase/migrations/20260715000002_rls_performance.sql`:

```sql
create index pages_theme_id_idx on pages(theme_id);

drop policy "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using ((select auth.uid()) = id);

drop policy "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using ((select auth.uid()) = id);

drop policy "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check ((select auth.uid()) = id);

drop policy "pages_owner_all" on pages;
create policy "pages_owner_all" on pages for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy "links_owner_all" on links;
create policy "links_owner_all" on links for all using (
  (select auth.uid()) = (select owner_id from pages where pages.id = links.page_id)
) with check (
  (select auth.uid()) = (select owner_id from pages where pages.id = links.page_id)
);

drop policy "social_links_owner_all" on social_links;
create policy "social_links_owner_all" on social_links for all using (
  (select auth.uid()) = (select owner_id from pages where pages.id = social_links.page_id)
) with check (
  (select auth.uid()) = (select owner_id from pages where pages.id = social_links.page_id)
);

drop policy "analytics_owner_select" on analytics;
create policy "analytics_owner_select" on analytics for select using (
  (select auth.uid()) = (select owner_id from pages where pages.id = analytics.page_id)
);
```

- [ ] **Step 2: Aplicar via MCP**

`mcp__claude_ai_Supabase__apply_migration`, `project_id evkmyrozkpqehunnlbif`, `name: "rls_performance"`.

- [ ] **Step 3: Verificar**

`mcp__claude_ai_Supabase__get_advisors` (performance e security) — confirmar que os itens `auth_rls_initplan` e o índice ausente em `pages.theme_id` não aparecem mais. Confirmar via `execute_sql`/`list_tables` que as policies ainda têm exatamente o mesmo efeito de acesso de antes (dono vs. público), só reescritas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260715000002_rls_performance.sql
git commit -m "perf: otimiza policies de RLS com subselect em auth.uid() e indexa pages.theme_id"
```

---

### Task 14: Atualizar documentação (CLAUDE.md, README.md) e commitar o plano

**Files:**
- Modify: `CLAUDE.md`, `README.md`
- Create (commit): `docs/superpowers/plans/2026-07-15-fase-1-fundacao.md` (este arquivo — nunca tinha sido commitado)

- [ ] **Step 1: Reescrever `CLAUDE.md`** refletindo o estado real após a Fase 1: stack instalada (React 19 + Vite + TS + Tailwind v4 + shadcn/ui + React Router v7 + TanStack Query + Supabase), comandos reais (`npm run dev/build/lint/typecheck/test`), arquitetura real (`AuthGuard` → `AppLayout` → rotas lazy; `src/features/<domínio>`; schema Supabase com RLS; CI no GitHub Actions), e remover a seção "greenfield" que não é mais verdadeira.

- [ ] **Step 2: Reescrever `README.md`** com nome do projeto, stack, e os comandos reais de desenvolvimento (substituindo o template padrão do Vite).

- [ ] **Step 3: Commitar o plano de implementação**, que existe no disco desde o início da Fase 1 mas nunca foi adicionado ao git.

```bash
git add CLAUDE.md README.md docs/superpowers/plans/2026-07-15-fase-1-fundacao.md
git commit -m "docs: atualiza CLAUDE.md e README.md com o estado real pos-fase-1 e commita o plano"
```

- [ ] **Step 4: Push das novas tarefas para o PR existente**

```bash
git push origin feature/fase-1-fundacao
gh pr checks feature/fase-1-fundacao
```
Expected: CI roda novamente no PR #1 e passa.
