# Tomodachi Dictionary

Web editor for Tomodachi Life: Living the Dream islander dialogue and nicknames. Local storage by default; optional Supabase sync.

## Quick start

```bash
npm install
cp .env.example .env   # optional — cloud accounts
npm run dev
```

```bash
npm run build   # typecheck + tests + production bundle
npm test
```

## Optional setup

| Feature | What you need |
|--------|----------------|
| Cloud sync | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` / Vercel; run `supabase/schema.sql` |
| AI generate | Gemini API key in app **Configuration** (per device) |
| Seed data | Copy `public/*.example` → `public/seed.md` and `nicknames-seed.json` (gitignored) |

Deploy: Vite static build to Vercel or Cloudflare Pages (`dist/`). Disable Supabase email confirmation for username-only sign-up.
