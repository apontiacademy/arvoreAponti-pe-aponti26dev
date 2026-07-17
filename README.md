# ApontiLinkCenter

Internal tool for managing "link tree" pages (Linktree/Bento.me/Beacons.ai style) — create, edit, and publish pages made of link/social/media blocks, with drag-and-drop reordering, per-page theming, and analytics. Access is restricted to authenticated employees only; see `CLAUDE.md` for the full architecture, domain model, and current build status.

## Stack

React 19, Vite 8, TypeScript, Tailwind CSS v4, shadcn/ui (`base-nova` style on `@base-ui/react`), React Router v7, TanStack Query, Supabase (Postgres + Auth), Vitest + Testing Library, oxlint.

## Prerequisites

- Node.js 22+
- npm
- Access to the `arvore-aponti` Supabase project (org "Aponti", region `sa-east-1`) — this is a **shared** project with the real schema and seeded data, not something you provision yourself. Get the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values from a teammate; don't create a new empty Supabase project, or the app will have no schema/seeded themes and nothing will work.

## Setup

```bash
npm install
cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with the shared project's values
```

## Development

```bash
npm run dev         # start the Vite dev server
npm run build       # type-check (tsc -b) and build for production
npm run preview     # preview the production build locally
npm run lint        # oxlint
npm run typecheck   # tsc -b --noEmit
npm test            # vitest run
```

## Database

Supabase schema and RLS policies are versioned as SQL under `supabase/migrations/`. There is no local Supabase CLI setup yet — migrations are applied directly to the remote project.

## More detail

See `CLAUDE.md` for architecture, the domain model, routing, current build status, and known gaps to be aware of before extending the app.
