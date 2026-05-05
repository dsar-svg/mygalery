# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Art Gallery & Portfolio web app, ported from Vercel/v0.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (scaffold only; app data is in Supabase)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **`artifacts/art-gallery`** — Main React + Vite web app (serves at `/`)
  - Supabase for auth (Google OAuth) and data (artworks, settings, allowed_emails tables)
  - Tailwind CSS v4 with custom theme (bone, charcoal palette + Cormorant Garamond / Inter fonts)
  - React Router DOM v7 for routing
  - motion (Framer Motion) for animations
  - qrcode.react for QR code generation
  - Spanish-language UI
- **`artifacts/api-server`** — Express API server (serves at `/api`)

## Environment Variables Required

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous API key

## App Routes

- `/` — Gallery landing page with hero + artwork grid
- `/artwork/:id` — Individual artwork detail with zoom + share
- `/login` — Admin login (email check + Google OAuth)
- `/auth/callback` — OAuth callback
- `/admin` — Admin panel (manage artworks, settings, access)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
