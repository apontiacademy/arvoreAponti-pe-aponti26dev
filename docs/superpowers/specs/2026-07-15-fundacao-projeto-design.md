# Fase 1 — Fundação do projeto ApontiLinkCenter

Data: 2026-07-15

## Contexto

O `prompt.MD` (raiz do repo) define o produto completo: uma plataforma interna de gestão de "Árvores de Links" (estilo Linktree/Bento.me/Beacons.ai), sem funcionalidades SaaS (sem planos, billing, marketplace, white-label, multi-empresa). O briefing já propõe uma ordem de entrega em 12 etapas. Este spec cobre apenas a primeira fatia — fundação técnica — para permitir que as fases seguintes (Dashboard, CRUD, Editor Drag-and-Drop, Página Pública, Analytics) sejam especificadas e implementadas uma de cada vez.

## Escopo da Fase 1

**Entra:**
- Repositório GitHub configurado com gitflow (`main` / `staging` / `develop` + `feature/*` via PR)
- Scaffold Vite + React + TypeScript + Tailwind v4 + shadcn/ui + React Router + TanStack Query
- Projeto Supabase novo, schema inicial com RLS
- CI básico (lint + typecheck + build em PRs)
- Esqueleto de rotas (todas as telas, com placeholder) protegido por Supabase Auth

**Não entra (fases futuras):** lógica de CRUD real, editor drag-and-drop, renderização completa da página pública, dashboard de analytics, temas visuais completos.

## Repositório & Gitflow

- Repo: `apontiacademy/arvoreAponti-pe-aponti26dev` (já existia vazio na org, criado na mesma data do `prompt.MD`).
- Branches permanentes: `main` (produção, protegida), `staging` (pré-prod, protegida), `develop` (integração).
- Fluxo: `feature/<nome>` a partir de `develop` → PR para `develop` → PR `develop` → `staging` para homologar → PR `staging` → `main` para liberar em produção. `hotfix/*` a partir de `main` quando necessário.
- Proteção de branch em `main`/`staging`: exigir PR, sem push direto (sujeito a permissão de admin do org).
- Package manager: npm.
- Nome do app (package.json / título): `apontilinkcenter`.

## Estrutura de pastas

```
arvoreAponti-pe-aponti26dev/
├─ .github/workflows/ci.yml
├─ prompt.MD
├─ CLAUDE.md
├─ supabase/
│  ├─ config.toml
│  └─ migrations/            # schema versionado (SQL)
├─ src/
│  ├─ app/                   # bootstrap: main.tsx, App.tsx, providers (QueryClient, Router, Theme)
│  ├─ routes/                 # uma pasta por tela
│  ├─ components/
│  │  ├─ ui/                 # shadcn/ui + componentes 21st.dev
│  │  └─ layout/             # Sidebar, Topbar, Breadcrumb
│  ├─ features/               # lógica por domínio (auth/, pages/, links/, analytics/, themes/)
│  ├─ hooks/                  # hooks reutilizáveis cross-feature
│  ├─ lib/                    # supabase client, query client, utils
│  └─ types/                   # tipos compartilhados (gerados do Supabase + domínio)
├─ .env.example
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

Regra: telas em `routes/` só montam layout e consomem `features/`; regra de negócio e chamadas ao Supabase ficam em `features/<dominio>` (hooks TanStack Query + schemas Zod), evitando duplicação entre editor e página pública, por exemplo.

## Schema Supabase (Fase 1)

RLS restringindo por `auth.uid()` no dono, exceto onde marcado como público.

- **profiles** — 1:1 com `auth.users`. `id` (= user id), `username` (unique), `display_name`, `avatar_url`, `bio`, `created_at`. RLS: dono lê/edita o próprio; leitura pública apenas via view.
- **pages** — a "árvore". `id`, `owner_id → profiles`, `slug` (unique, usado na URL pública), `title`, `description`, `is_published` (bool), `theme_id → themes`, `settings jsonb` (cor primária/secundária, fonte, background, radius, sombra, largura, espaçamento), `created_at`, `updated_at`. RLS: dono faz tudo; leitura pública só quando `is_published = true`.
- **links** — blocos do editor. `id`, `page_id → pages`, `type` (title/text/link/whatsapp/instagram/tiktok/telegram/youtube/spotify/pix/email/phone/image/video), `order` (int), `label`, `url`, `payload jsonb`, `is_active`. RLS: dono da `page` faz tudo; leitura pública segue visibilidade da `page`.
- **social_links** — ícones sociais fixos do perfil. `id`, `page_id → pages`, `platform`, `url`, `order`.
- **themes** — presets (Minimal, Dark, Glass, Corporate, Modern) seed; `pages.theme_id` aponta pra cá, `pages.settings` sobrescreve pontos específicos.
- **analytics** — eventos brutos: `id`, `page_id`, `link_id` (nullable = view de página), `event_type` (view/click), `device`, `os`, `browser`, `referrer`, `created_at`. Índices em `(page_id, created_at)` e `(link_id, created_at)`. View agregada (`analytics_summary`) para os números do dashboard, evitando `COUNT` pesado direto na tabela bruta.

RPC functions especulativas (ex: reorder em lote) ficam para quando a fase que precisar delas for especificada.

## Rotas base

Layout autenticado (`AppLayout`: Sidebar + Topbar + Breadcrumb) com guard redirecionando para `/login` sem sessão Supabase:

```
/login                    (público)
/                          → redirect para /dashboard
/dashboard                 (protegida)
/pages                      (protegida)
/pages/new                  (protegida)
/pages/:id/edit             (protegida)
/analytics                  (protegida)
/profile                    (protegida)
/settings                   (protegida)
/:username                  (público) — página pública da árvore
*                           → 404
```

Rotas lazy-loaded (`React.lazy` + `Suspense`) com skeleton de loading. Nesta fase, telas protegidas têm apenas placeholder (título + breadcrumb).

## CI, Vercel e Supabase — execução

- **Supabase**: novo projeto na org "Aponti" (região `sa-east-1`), nome `arvore-aponti`; migrations desta fase aplicadas via MCP.
- **Vercel**: produção aponta para `main`; demais branches geram preview. Conexão feita quando chegarmos nessa etapa de execução.
- **CI**: `.github/workflows/ci.yml` rodando em PRs para `develop`/`staging`/`main`: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build`.
