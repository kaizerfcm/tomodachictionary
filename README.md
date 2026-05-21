# Tomodict

Web and Android editor for islander dialogue, nicknames, and avatars. Local storage by default; optional Supabase sync.

## Quick start

```bash
npm install
cp .env.example .env   # optional — cloud + Stripe
npm run dev
```

```bash
npm run build   # typecheck + tests + production bundle
npm test
```

## Optional setup

| Feature | Setup |
|--------|--------|
| Cloud sync | `VITE_SUPABASE_*` on Vercel (Supabase integration or manual) + `supabase/schema.sql` + `user_profiles.sql` + `community_phrases.sql` |
| Web payments | `VITE_PAYMENT_URL_INTL` + deploy `stripe-webhook` — [docs/MONETIZATION.md](docs/MONETIZATION.md) |
| Android APK | [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md) |

```bash
npm run supabase:deploy-webhook   # after secrets are set in Supabase
```

Supabase Auth: **Email ON**, **Confirm email OFF**.

Deploy: Vite static build (`dist/`) to Vercel or similar.
