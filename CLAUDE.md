# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently **greenfield** — the only file present is `prompt.MD`, the Portuguese-language product/tech spec that defines what to build. No `package.json`, source tree, or Supabase project has been created yet. There are no build/lint/test commands to run because no tooling has been scaffolded.

Until the project is scaffolded, treat `prompt.MD` as the single source of truth for requirements. Once code exists, update this file with real commands (dev server, lint, typecheck, test) and the actual architecture — don't leave this section stale.

## What is being built

An internal tool for the company to manage "link tree" pages (Linktree/Bento.me/Beacons.ai style) — create, edit, and publish pages made of link/social/media blocks, with drag-and-drop reordering, per-page theming, and analytics. Access is restricted to authenticated employees only.

Explicitly **out of scope** — do not add SaaS-style features:
- Plans, pricing, subscriptions, billing
- Marketplace
- White-labeling
- Multi-tenant/multi-company support

## Planned stack

React + Vite + TypeScript, TailwindCSS v4, shadcn/ui, React Router, TanStack Query, React Hook Form + Zod, Framer Motion, Lucide React, Sonner, Supabase (Postgres + Auth).

- Prefer components from **21st.dev** wherever an equivalent exists; don't hand-roll a component that already has a 21st.dev/shadcn equivalent.
- Follow the "Kraken DESIGN.md" design system for visual consistency (colors, spacing, radius, shadows) — this file does not yet exist in the repo; if referenced work depends on it, check with the user before inventing design tokens.
- Do not copy competitor layouts directly; only reuse compatible components/patterns.

## Domain model (planned Supabase schema)

Core tables to create: `profiles`, `pages`, `links`, `social_links`, `analytics`, `themes`. Each page ("árvore") belongs to a profile and has many links/social links, a theme, and analytics events. Supabase Auth gates all dashboard/editor access — only authenticated users can manage pages; the public page view is unauthenticated.

Expect to need RLS policies, indexes, triggers, views, and RPC functions per table as features are built — don't build the schema as bare tables without policies.

Analytics must auto-capture: views, clicks, timestamp, device, OS, browser, referrer, per-page and per-link aggregates (most-viewed page, most-clicked link), surfaced via a dashboard with charts.

## Screens / feature surface

Login, Dashboard, Page list (search + duplicate), Create/Edit page (drag-and-drop editor), Public page view, Analytics, Profile, Settings, 404.

Editor block types: Title, Text, Link, WhatsApp, Instagram, TikTok, Telegram, YouTube, Spotify, Pix, Email, Phone, Image, Video.

Per-page personalization: primary/secondary color, font, background (color/image/gradient), radius, shadow, width, spacing, theme preset (Minimal, Dark, Glass, Corporate, Modern), light/dark mode.

## Build order

The spec defines an intended delivery sequence — follow it rather than jumping ahead to later-stage features before earlier ones exist:

1. Architecture
2. Folder structure
3. Supabase schema
4. Routes
5. Base components
6. Layout (sidebar + topbar + main area)
7. Dashboard
8. Page CRUD
9. Drag-and-drop editor
10. Public page
11. Analytics
12. Tests and refinement

## Working conventions

- Always produce production-ready code — no placeholder/temporary implementations.
- Favor small, reusable, strongly-typed components and hooks; avoid duplication.
- Apply SOLID where it genuinely fits a component/hook boundary — don't force it onto simple CRUD code.
- Editor UX must support autosave while editing and a confirmation step before destructive actions (deleting links/pages).
- Performance: lazy-load routes, code-split the editor, memoize expensive renders, keep TanStack Query keys/queries scoped to avoid over-fetching.
