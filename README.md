# Tomodachi Life Dialogue Dictionary

A lightweight web app to manage Tomodachi Life: Living the Dream islander dialogue — phrases, nicknames, and optional Gemini-assisted generation.

**Storage options:**

- **Local** — data stays in the browser (`localStorage`) on that device only.
- **Account** (optional) — free cloud save via [Supabase](https://supabase.com) so the same island syncs on phone and PC.

## Local development

```bash
npm install
cp .env.example .env   # optional, for cloud sync
npm run dev
```

Open the URL shown (use the **Network** line to access from your phone on the same Wi‑Fi).

### Cloud sync setup (Supabase, free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run the script in [`supabase/schema.sql`](supabase/schema.sql).
3. **Settings → API** → copy Project URL and `anon` public key into `.env`:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. **Authentication → Providers → Email** → for easiest testing, turn off **Confirm email** (or users must confirm before first sign-in).
5. Restart `npm run dev`.

Without `.env`, the app still works in **Continue locally** mode only.

### Optional seed files (not in this repo)

```bash
copy public\seed.md.example public\seed.md
copy public\nicknames-seed.json.example public\nicknames-seed.json
```

These are **gitignored** so personal dialogue is never pushed to GitHub.

### Gemini API (optional)

Configuration → paste a [Google AI Studio](https://aistudio.google.com/apikey) key. Stored in `localStorage` on each device (not in the cloud).

## Deploy for free

Static Vite build (`dist/`). Works on **Vercel** or **Cloudflare Pages** at no cost.

### Vercel

1. Import the GitHub repo on [vercel.com](https://vercel.com).
2. Framework: **Vite** (see `vercel.json`).
3. **Environment variables** (for account sync):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

4. Redeploy after adding variables.

### Cloudflare Pages

- Build: `npm run build`
- Output: `dist`
- Add the same `VITE_*` variables under **Settings → Environment variables**.

SPA routing: `public/_redirects`.

## Publish to GitHub (`kaizerfcm`)

```bash
git remote add origin https://github.com/kaizerfcm/tomodachictionary.git
git push -u origin main
```

## Build

```bash
npm run build
npm run preview
```

## License

Private / personal use — dialogue content you add is your own.
