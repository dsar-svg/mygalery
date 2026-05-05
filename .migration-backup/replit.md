# Art Gallery & Portfolio

An elegant art gallery and portfolio web app with a private admin panel for curating and managing artworks. Built with Vite + React, Tailwind CSS v4, and Supabase for authentication, data storage, and image uploads.

## Architecture

- **Frontend**: `artifacts/art-gallery/` — Vite + React SPA served at `/`
- **Backend**: Supabase (external) — handles auth (Google OAuth + email/password), PostgreSQL database, and object storage for artwork images
- **API Server**: `artifacts/api-server/` — scaffold Express server (not actively used by this app)

## Key Features

- **Landing page** — full-screen hero with artwork grid, motion animations
- **Artwork detail** — image zoom, share link copy, technique + price display
- **Admin panel** — create/edit/delete artworks, QR code generation + download/print, gallery settings (name, hero image, currency, footer)
- **Authentication** — Supabase auth with Google OAuth and email/password login
- **Admin gating** — only users in `allowed_emails` Supabase table can access `/admin`

## Environment Variables

Required secrets (set in Replit Secrets):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Supabase Schema

The app expects these Supabase tables:
- `artworks` — id, name, description, technique, price, image_url, owner_id, created_at, updated_at
- `settings` — id (fixed UUID `00000000-0000-0000-0000-000000000001`), gallery_name, hero_line1, hero_line2, hero_image_url, footer_description, currency, updated_at
- `allowed_emails` — email (used for admin access gating)
- Supabase Storage bucket: `artworks` (for image uploads)

## Tech Stack

- React 19 + React Router DOM v7
- Tailwind CSS v4 (custom theme: Cormorant Garamond serif, Inter sans, bone/charcoal palette)
- Framer Motion (via `motion` package)
- @supabase/supabase-js
- qrcode.react (QR code generation for artworks)
- lucide-react (icons)

## Development

The app runs via the Replit workflow `artifacts/art-gallery: web`.
Do not run `pnpm dev` at the workspace root — use the workflow system instead.
