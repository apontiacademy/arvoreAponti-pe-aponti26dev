# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 1 ("Fundação") is complete: the repo is scaffolded (Vite + React + TypeScript), Supabase Auth-gated routing is in place, the initial Supabase schema with RLS is live, and CI runs on every PR. See `docs/superpowers/plans/2026-07-15-fase-1-fundacao.md` for the full implementation log and `docs/superpowers/specs/2026-07-15-fundacao-projeto-design.md` for the original design spec. `prompt.MD` remains the original Portuguese product/tech brief.

Post-Phase-1 hardening (2026-07-17): `profiles` auto-provisioning, `useSession` error handling, and orphaned scaffold assets are resolved — see "Known gaps / next steps" for what's still open.

Next up is Phase 2 (Dashboard → Page CRUD → drag-and-drop editor — see "Build order" below).

## What is being built

An internal tool for the company to manage "link tree" pages (Linktree/Bento.me/Beacons.ai style) — create, edit, and publish pages made of link/social/media blocks, with drag-and-drop reordering, per-page theming, and analytics. Access is restricted to authenticated employees only.

Explicitly **out of scope** — do not add SaaS-style features:
- Plans, pricing, subscriptions, billing
- Marketplace
- White-labeling
- Multi-tenant/multi-company support

## Current stack

React 19 + Vite 8 + TypeScript (~6.0), TailwindCSS v4 (`@tailwindcss/vite`, CSS-based config via `@theme` in `src/index.css` — there is **no** `tailwind.config.js`), shadcn/ui (CLI v4, `base-nova` style/preset, built on **`@base-ui/react` primitives, not Radix** — a deliberate deviation from the shadcn default worth remembering when adding components or reading shadcn docs), React Router v7 (`createBrowserRouter` data router), TanStack Query v5 (`@tanstack/react-query`), Supabase JS client (`@supabase/supabase-js`), Vitest + Testing Library (`jsdom` environment), oxlint (not ESLint — the current Vite scaffold default; config in `.oxlintrc.json`).

Package manager: npm.

See `README.md` for the canonical list of npm scripts (dev/build/lint/typecheck/test/preview) — don't duplicate that list here; if it drifts, update README.md and this line stays a pointer.

Not yet installed/wired despite being in the original planned stack: React Hook Form + Zod, Framer Motion, Sonner. Lucide React (`lucide-react`) is installed and is shadcn's configured icon library.

- Prefer components from **21st.dev** wherever an equivalent exists; don't hand-roll a component that already has a 21st.dev/shadcn equivalent.
- Follow the "Kraken DESIGN.md" design system for visual consistency (colors, spacing, radius, shadows) — this file does not yet exist in the repo; if referenced work depends on it, check with the user before inventing design tokens.
- Do not copy competitor layouts directly; only reuse compatible components/patterns.

## Architecture

- `src/main.tsx` → `src/App.tsx` → `AppProviders` (`src/app/providers.tsx`, TanStack Query's `QueryClientProvider`) → `RouterProvider` with the router from `src/routes/router.tsx`.
- `main.tsx` and `App.tsx` intentionally stay at `src/` root, not inside `src/app/` — only cross-cutting providers live in `src/app/`. Don't move the entrypoint without discussing it first; it was a deliberate call, not an oversight.
- Routing (`src/routes/router.tsx`): `/login` and `/:username` (public page view) are public. Everything else is nested under `AuthGuard` (`src/features/auth/AuthGuard.tsx`, redirects to `/login` when there is no Supabase session) → `AppLayout` (`src/components/layout/AppLayout.tsx`: Sidebar + Topbar + Breadcrumb shell) → lazy-loaded page components (`React.lazy` + `Suspense`) under `src/routes/<screen>/`.
- Feature modules live in `src/features/<domain>/` — currently only `auth` (`useSession.ts`, `AuthGuard.tsx`). Follow this pattern for new domains (e.g. `pages`, `analytics`) rather than dumping logic into route components.
- `src/components/ui/` — shadcn-generated primitives (currently just `button.tsx`). `src/components/layout/` — app shell components.
- `src/lib/supabase.ts` — Supabase client, reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from env and throws if missing. `src/lib/utils.ts` — shadcn's `cn()` helper.
- Tests live next to the code they cover (`*.test.tsx`/`*.test.ts`), plus `src/test/setup.ts` (jest-dom matchers) and a `src/test/smoke.test.ts` runner sanity check.

## Domain model (Supabase schema)

Live project: `arvore-aponti`, Supabase org "Aponti", region `sa-east-1`. Schema is versioned in `supabase/migrations/` (5 migrations so far: initial schema, an analytics RLS-bypass security fix, an RLS performance optimization, a `profiles` auto-provisioning trigger on `auth.users` insert, and a follow-up revoking public EXECUTE on that trigger function) and was applied directly to the remote project via the Supabase MCP tools — **there is no local Supabase CLI setup** (no `supabase/config.toml`); see "Known gaps" below.
- `public.handle_new_user()` (SECURITY DEFINER, `search_path = public`) derives a `username` from the email local-part and de-duplicates on `unique_violation` (retry loop, not check-then-insert, to stay race-safe). EXECUTE is revoked from `public`/`anon`/`authenticated` — it's only meant to run via the `on_auth_user_created` trigger, not as a callable RPC. Follow this same lockdown pattern for any other SECURITY DEFINER function.

Tables: `profiles` (1:1 with `auth.users`), `pages` (owned by a profile via `owner_id`), `links`, `social_links`, `analytics`, `themes` (5 seeded presets: Minimal, Dark, Glass, Corporate, Modern). Each page ("árvore") belongs to a profile and has many links/social links, one theme, and analytics events.

- RLS is enabled on every table. Pattern: owner has full access (`auth.uid() = owner_id`, wrapped in a `(select auth.uid())` subselect per-policy for query-plan performance — do not regress this when adding policies), public/anon can only `select` from **published** pages, their active links, and all their social links. `themes` is public-read. The `analytics_summary` view uses `security_invoker = true` so it respects the caller's RLS rather than the view owner's.
- Indexes exist on all foreign keys used in RLS lookups (`pages.owner_id`, `links.page_id`, `social_links.page_id`, `analytics.page_id`/`link_id`, `pages.theme_id`).
- Analytics captures `event_type` (`view`|`click`), device, OS, browser, referrer, timestamp, per page and optionally per link; `analytics_summary` aggregates `total_views`/`total_clicks` per page. Public insert into `analytics` is restricted to published pages only (fixed in the second migration — the original policy allowed inserting analytics rows for unpublished/private pages, an RLS bypass).
- Not yet built: RPC functions, triggers, most-viewed/most-clicked-link aggregates beyond the basic view.

## Screens / feature surface

Login, Dashboard, Page list (search + duplicate), Create/Edit page (drag-and-drop editor), Public page view, Analytics, Profile, Settings, 404. Route placeholders for all of these already exist under `src/routes/`; only `Login` and `AppLayout` have real behavior so far — the rest render static placeholder text pending their build-order slot below.

Editor block types (planned, matches the `links.type` check constraint): Title, Text, Link, WhatsApp, Instagram, TikTok, Telegram, YouTube, Spotify, Pix, Email, Phone, Image, Video.

Per-page personalization: primary/secondary color, font, background (color/image/gradient), radius, shadow, width, spacing, theme preset (Minimal, Dark, Glass, Corporate, Modern), light/dark mode.

## Build order

Phase 1 (done): Architecture, folder structure, Supabase schema, routes, base components, layout (sidebar + topbar + main area).

Remaining, in order — don't jump ahead:

1. Dashboard
2. Page CRUD
3. Drag-and-drop editor
4. Public page (rendering + view/click analytics capture)
5. Analytics dashboard
6. Tests and refinement

## Known gaps / next steps

Resolved (2026-07-17):
- ~~No `profiles` auto-provisioning on signup~~ — fixed via `on_auth_user_created` trigger + `handle_new_user()` (migration `20260717000000_profiles_auto_provisioning.sql`); see "Domain model" above.
- ~~Orphaned Vite demo assets~~ — `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` removed (all unreferenced).
- ~~`useSession` had no error handling~~ — `getSession()` rejection is now caught, exposed as an `error` field, and `isLoading` always resolves to `false` via `finally` (was getting stuck at `true`).

Still open, read before starting Phase 2:

- **No local Supabase CLI setup.** `supabase/config.toml` does not exist; all schema work went straight to the remote project via the Supabase MCP tools. Consider adding `supabase init`/local dev if iterating on migrations gets painful.
- **CI is advisory, not merge-blocking.** Branch protection on `main`/`staging` could not be enabled (GitHub Free plan doesn't support required status checks on private repos). `.github/workflows/ci.yml` only triggers on `pull_request` to `develop`/`staging`/`main`, not on direct pushes.
- Planned-but-unused deps: React Hook Form + Zod, Framer Motion, Sonner — install when the first screen that needs them is built (Page CRUD forms are the likely first consumer of RHF+Zod).

## Working conventions

- Always produce production-ready code — no placeholder/temporary implementations (route placeholders from Phase 1 are the sanctioned exception, tracked above — replace them as their build-order slot comes up, don't add new placeholders elsewhere).
- Favor small, reusable, strongly-typed components and hooks; avoid duplication.
- Apply SOLID where it genuinely fits a component/hook boundary — don't force it onto simple CRUD code.
- Editor UX must support autosave while editing and a confirmation step before destructive actions (deleting links/pages).
- Performance: lazy-load routes, code-split the editor, memoize expensive renders, keep TanStack Query keys/queries scoped to avoid over-fetching.
- New Supabase schema changes go in a new file under `supabase/migrations/`, applied via the Supabase MCP tools, and must ship with RLS policies (not bare tables) — follow the `(select auth.uid())` subselect pattern used in the existing policies.
- Gitflow: `main`/`develop`/`staging` are permanent branches; work happens on `feature/*` branches off `develop`, merged via PR (CI runs lint/typecheck/test/build on the PR).
