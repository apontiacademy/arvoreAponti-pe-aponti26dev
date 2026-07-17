# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 1 ("Fundação") is complete: the repo is scaffolded (Vite + React + TypeScript), Supabase Auth-gated routing is in place, the initial Supabase schema with RLS is live, and CI runs on every PR. See `docs/superpowers/plans/2026-07-15-fase-1-fundacao.md` for the full implementation log and `docs/superpowers/specs/2026-07-15-fundacao-projeto-design.md` for the original design spec. `prompt.MD` remains the original Portuguese product/tech brief.

Post-Phase-1 hardening (2026-07-17): `profiles` auto-provisioning, `useSession` error handling, and orphaned scaffold assets are resolved — see "Known gaps / next steps" for what's still open.

Phase 2 — Dashboard (2026-07-17): done, including a real Login screen that turned out to still be a placeholder despite earlier docs claiming otherwise. See "Screens / feature surface" and "Known gaps" below.

Phase 2 — Page CRUD (2026-07-17): done — list/search, create, edit (with autosave), publish/unpublish, duplicate, delete with confirmation. Links/blocks themselves are **not** part of this — that's the next phase (drag-and-drop editor).

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

React Hook Form + Zod (+ `@hookform/resolvers`) are installed and wired (Login, Page create/edit forms). Sonner is installed and wired — `<Toaster />` renders once in `src/app/providers.tsx`, `toast.success`/`toast.error` used for mutation feedback (see "Screens" below). Still not installed: Framer Motion. Lucide React (`lucide-react`) is installed and is shadcn's configured icon library.

- Prefer components from **21st.dev** wherever an equivalent exists; don't hand-roll a component that already has a 21st.dev/shadcn equivalent.
- Design tokens (colors, radius, background) live in `src/index.css` and are copied from the **penteFinoWeb** repo's `app/globals.css` (`apontiacademy/penteFinoWeb-pe-aponti26dev`) — this is the actual cross-project Aponti palette ("Kraken DESIGN.md" never materialized as a file; this is its de facto replacement). Primary `#6518EA` (roxo), accent `#FBC100` (amarelo), `--radius: 0.65rem`, plus a subtle radial-gradient brand wash on `body`. Font stays Geist Variable (Fontsource) — penteFinoWeb uses Inter via `next/font`, but that wasn't part of the "match the colors" ask and this project isn't on Next.js. If penteFinoWeb's palette changes, re-sync `src/index.css` by hand (no shared token package exists yet).
- Do not copy competitor layouts directly; only reuse compatible components/patterns.

## Architecture

- `src/main.tsx` → `src/App.tsx` → `AppProviders` (`src/app/providers.tsx`, TanStack Query's `QueryClientProvider`) → `RouterProvider` with the router from `src/routes/router.tsx`.
- `main.tsx` and `App.tsx` intentionally stay at `src/` root, not inside `src/app/` — only cross-cutting providers live in `src/app/`. Don't move the entrypoint without discussing it first; it was a deliberate call, not an oversight.
- Routing (`src/routes/router.tsx`): `/login` and `/:slug` (public page view, matched by `pages.slug` — **not** `profiles.username`; a page owner can have several pages, each with its own public URL) are public. Everything else is nested under `AuthGuard` (`src/features/auth/AuthGuard.tsx`, redirects to `/login` when there is no Supabase session) → `AppLayout` (`src/components/layout/AppLayout.tsx`: Sidebar + Topbar + Breadcrumb shell) → lazy-loaded page components (`React.lazy` + `Suspense`) under `src/routes/<screen>/`.
- Feature modules live in `src/features/<domain>/` — `auth` (`useSession.ts`, `AuthGuard.tsx`) and `pages`: `usePages.ts` (list, scoped to owner, `updated_at desc`), `usePage.ts` (single page by id), `useCreatePage.ts`, `useUpdatePage.ts` (takes `{ id, values }` at mutate-time, not bound to the hook call, so one instance can update many rows — e.g. the publish toggle in a list), `useDeletePage.ts`, `useDuplicatePage.ts` (retry-on-`23505`-unique_violation loop appending `-copia`, `-copia-1`, ... to the slug — same pattern as the `handle_new_user` DB trigger), `pageSchema.ts` (shared Zod schema for create/edit forms), `slugify.ts` (title → URL slug, strips diacritics via `\p{Diacritic}` Unicode property escape). Follow this pattern for new domains (e.g. `analytics`) rather than dumping logic into route components.
- `src/components/ui/` — shadcn-generated primitives: `button`, `card`, `badge`, `skeleton`, `input`, `label`, `textarea`, `switch`, `dropdown-menu`, `alert-dialog`, `sonner` (Toaster wrapper — pulls in `next-themes` and `sonner` as transitive deps; no `ThemeProvider` is set up, so it always renders in `next-themes`' default "system" state, which is fine since there's no dark/light toggle yet). No `form.tsx` — the `base-nova` registry doesn't ship one, so forms wire `react-hook-form`'s `register`/`handleSubmit` directly against `Input`/`Label`/`Textarea` instead of a Radix-style `Form` wrapper. `src/components/layout/` — `AppLayout` (shell), `Sidebar` (real nav via `NavLink`, active-state highlighting), `Topbar` (shows the signed-in user's email + sign-out), `Breadcrumb` (still static, pending a later pass).
- Destructive confirmations use `AlertDialog`. When the trigger lives inside a `DropdownMenu` (e.g. the "Excluir" row action in `PagesListPage`), do **not** nest `AlertDialogTrigger` inside a `DropdownMenuItem` — the menu closes on item click before the dialog can take over, causing focus/portal issues. Instead keep a piece of state (e.g. `pageToDelete`) set by the menu item's `onClick`, and drive a single controlled `AlertDialog` via `open`/`onOpenChange` outside the menu. When the trigger is a standalone button (e.g. the delete button on `PageEditPage`), `AlertDialogTrigger render={<Button variant="destructive" />}` works directly, no extra state needed.
- `src/lib/supabase.ts` — Supabase client, typed with `Database` from `src/lib/database.types.ts` (generated via the Supabase MCP `generate_typescript_types` tool — re-run and regenerate by hand after schema changes, there's no CI step for this yet), reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from env and throws if missing. `src/lib/utils.ts` — shadcn's `cn()` helper.
- Base UI's `Button` uses a `render` prop (not shadcn's usual `asChild`) for polymorphic rendering, e.g. `<Button render={<Link to="/pages/new" />} nativeButton={false}>`. Always pass `nativeButton={false}` when rendering as a non-`<button>` element (an anchor/Link) — otherwise Base UI logs a dev warning about losing native button semantics. Note the rendered element still gets `role="button"` regardless, which is what tests must query by (`getByRole('button', ...)`, not `'link'`).
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

Login, Dashboard, Page list (search + duplicate), Create/Edit page (drag-and-drop editor), Public page view, Analytics, Profile, Settings, 404. Route placeholders for all of these exist under `src/routes/`. `Login`, `Dashboard`, and Page CRUD (list/create/edit) now have real behavior (below); Profile, Settings, and the public page view still render static placeholder text pending their build-order slot. The **drag-and-drop editor for links/blocks is not part of Page CRUD** — `PageEditPage` only edits page-level metadata (title, slug, description, published state) for now.

- **Login** (`src/routes/login/LoginPage.tsx`) — email/password form (`react-hook-form` + `zod` via `zodResolver`), calls `supabase.auth.signInWithPassword`, shows field-level validation errors and a generic "Email ou senha inválidos" alert on auth failure, navigates to `/dashboard` on success. Password field has a show/hide toggle (`Eye`/`EyeOff` from lucide, `aria-label` swaps between "Mostrar senha"/"Ocultar senha"). There is no self-serve signup screen — employees are provisioned some other way (see "Known gaps").
- **Dashboard** (`src/routes/dashboard/DashboardPage.tsx`) — reads `useSession()` + `usePages(session?.user.id)`. Three stat cards (total/publicadas/rascunhos), an "Árvores recentes" card (up to 5, most-recently-updated first) with a published/rascunho `Badge`, a skeleton loading state, an empty state with a "Criar primeira árvore" CTA, and an error message if the query fails. "Nova árvore" and both empty-state CTAs link to `/pages/new`.
- **Page list** (`src/routes/pages/PagesListPage.tsx`) — `usePages`, client-side search filter (title or slug, case-insensitive — no server round-trip), skeleton/empty/error states like the Dashboard. Each row has a `DropdownMenu` with Editar, "Ver página pública" (disabled via `disabled={!page.is_published}` until published, opens `/${slug}` in a new tab), Duplicar, Publicar/Despublicar, and Excluir (destructive, routes through the confirmation `AlertDialog` described in "Architecture" above). All mutations show a `toast.success`/`toast.error`.
- **Create page** (`src/routes/pages/PageNewPage.tsx`) — title/slug/description form. Slug auto-derives from title via `slugify()` until the user edits the slug field directly (tracked with a `slugEdited` boolean state, not a ref, since it needs to trigger the effect that stops the sync). On submit, `useCreatePage` looks up the `minimal` theme's id and sets it as `theme_id` (theme selection UI is deferred to the personalization/editor phase). A `23505` (unique_violation) error on `slug` is mapped to a friendly "Essa URL já está em uso." field error via `setError`; other errors fall back to a toast.
- **Edit page** (`src/routes/pages/PageEditPage.tsx`) — fetches via `usePage(id)`. Title/slug/description **autosave**: a debounced (800ms) effect compares the current form values against a "last saved" snapshot (a ref, updated on load and after each successful save) and calls `useUpdatePage` only when they actually differ — this avoids firing a save on initial mount/data-load, only on genuine edits. A small status line reflects `idle`/`saving`/`saved`/`error`. The publish `Switch` and the delete `AlertDialog` are separate, immediate actions (not part of the debounce). Same `23505` → friendly slug error handling as create.

Duplicating a page currently only copies the `pages` row itself (title, slug + `-copia` suffix, description, theme, settings) with `is_published` forced to `false` — it does **not** yet copy `links`/`social_links`, since those don't exist as a feature yet (drag-and-drop editor phase). Revisit `useDuplicatePage` once links exist so "Duplicar" actually duplicates the full tree, matching the `prompt.MD` spec.

Editor block types (planned, matches the `links.type` check constraint): Title, Text, Link, WhatsApp, Instagram, TikTok, Telegram, YouTube, Spotify, Pix, Email, Phone, Image, Video.

Per-page personalization: primary/secondary color, font, background (color/image/gradient), radius, shadow, width, spacing, theme preset (Minimal, Dark, Glass, Corporate, Modern), light/dark mode.

## Build order

Phase 1 (done): Architecture, folder structure, Supabase schema, routes, base components, layout (sidebar + topbar + main area).

Phase 2 step 1 (done): Dashboard — plus a real Login screen, which turned out to be a blocking prerequisite (see "Known gaps").

Phase 2 step 2 (done): Page CRUD — list/search/duplicate, create, edit-with-autosave, publish/unpublish, delete-with-confirmation. Public URL routing switched from `/:username` to `/:slug` to match (see "Architecture").

Remaining, in order — don't jump ahead:

1. Drag-and-drop editor (links/blocks: add, edit, delete, reorder — the `links` table already exists with its `type` check constraint)
2. Public page (rendering `PublicPagePage` for real + view/click analytics capture)
3. Analytics dashboard
4. Tests and refinement

## Known gaps / next steps

Resolved (2026-07-17):
- ~~No `profiles` auto-provisioning on signup~~ — fixed via `on_auth_user_created` trigger + `handle_new_user()` (migration `20260717000000_profiles_auto_provisioning.sql`); see "Domain model" above.
- ~~Orphaned Vite demo assets~~ — `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` removed (all unreferenced).
- ~~`useSession` had no error handling~~ — `getSession()` rejection is now caught, exposed as an `error` field, and `isLoading` always resolves to `false` via `finally` (was getting stuck at `true`).
- ~~Login was still a placeholder~~ despite this file previously claiming otherwise — it was discovered while trying to browser-verify the Dashboard (couldn't reach it without a working login). Real email/password Login now exists; see "Screens / feature surface".

Still open:

- **`useDuplicatePage` only copies the page row**, not its `links`/`social_links` — see "Screens / feature surface" for why (links don't exist as a feature yet) and revisit once the editor phase lands.
- **No dark/light mode toggle**, so `next-themes` (a transitive dep of the shadcn `sonner` component) always renders in its default "system" state. Wire up a real `ThemeProvider` when light/dark mode is tackled (it's in the planned per-page personalization + "Kraken" theming, listed in "Screens" below).
- **Theme selection isn't exposed in the UI yet** — `PageNewPage` always assigns the `minimal` preset's `theme_id`. Theme picking belongs to the personalization/editor phase.

- **No employee provisioning flow.** There's no signup screen by design (internal tool), but that means there's also no *other* way to create real employee accounts yet — no invite flow, no admin panel, no documented manual process. Right now the only accounts are: a `dev@aponti.local` test user inserted directly via SQL (see below) and whatever a teammate creates by hand via the Supabase dashboard. Decide on a provisioning approach before onboarding real users.
- **Self-serve signup is blocked in practice.** The project has "Confirm email" enabled in Supabase Auth, and the default email-sending rate limit (2/hour on the built-in SMTP) was hit during testing on 2026-07-17. Self-signup isn't part of the planned UX anyway (no signup screen), but if that ever changes, configure a custom SMTP provider first.
- **`dev@aponti.local` test user exists in the shared `arvore-aponti` project.** Created directly via SQL (`auth.users` + `auth.identities` insert, bypassing email confirmation) to unblock manual verification of Login/Dashboard, since self-serve signup was blocked (see above). Password: `Test1234!aponti`. Consider deleting it before this becomes a "real" shared environment with actual employee data, or keep it around as a known dev/QA account — team's call.
- **No local Supabase CLI setup.** `supabase/config.toml` does not exist; all schema work went straight to the remote project via the Supabase MCP tools. Consider adding `supabase init`/local dev if iterating on migrations gets painful.
- **CI is advisory, not merge-blocking.** Branch protection on `main`/`staging` could not be enabled (GitHub Free plan doesn't support required status checks on private repos). `.github/workflows/ci.yml` only triggers on `pull_request` to `develop`/`staging`/`main`, not on direct pushes.
- Planned-but-still-unused dep: Framer Motion — install when the first screen that needs it is built.
- `Breadcrumb` (`src/components/layout/Breadcrumb.tsx`) is still static placeholder text — low priority, but should become route-aware before the editor/CRUD screens ship (users will need it to navigate back out of nested pages).

## Working conventions

- Always produce production-ready code — no placeholder/temporary implementations (route placeholders from Phase 1 are the sanctioned exception, tracked above — replace them as their build-order slot comes up, don't add new placeholders elsewhere).
- Favor small, reusable, strongly-typed components and hooks; avoid duplication.
- Apply SOLID where it genuinely fits a component/hook boundary — don't force it onto simple CRUD code.
- Editor UX must support autosave while editing and a confirmation step before destructive actions (deleting links/pages).
- Performance: lazy-load routes, code-split the editor, memoize expensive renders, keep TanStack Query keys/queries scoped to avoid over-fetching.
- New Supabase schema changes go in a new file under `supabase/migrations/`, applied via the Supabase MCP tools, and must ship with RLS policies (not bare tables) — follow the `(select auth.uid())` subselect pattern used in the existing policies.
- Gitflow: `main`/`develop`/`staging` are permanent branches; work happens on `feature/*` branches off `develop`, merged via PR (CI runs lint/typecheck/test/build on the PR).
