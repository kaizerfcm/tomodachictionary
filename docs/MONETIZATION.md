# Monetization setup (fast checkout)

Goal: **one click from the app → payment page → one tap “I paid”** to hide ads. No extra screens unless the user needs PIX or the free opt-out.

## 1. Supabase Auth (email, no confirmation)

In [Supabase Dashboard](https://supabase.com/dashboard) → your project:

1. **Authentication → Providers → Email** → **Enable**
2. Same page → **Confirm email** → **OFF** (users sign in immediately after sign-up)
3. **Authentication → Sign In / Providers** → ensure **Email signups** are allowed (not disabled)

If you see `Email signups are disabled`, re-enable the Email provider as above.

Run SQL if you have not already:

- `supabase/schema.sql`
- `supabase/user_profiles.sql`

## 2. Stripe Payment Link (recommended, ~10 minutes)

Works internationally; supports cards; can add PIX in Brazil if your Stripe account supports it.

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Payment Links** → **Create**
2. Product: one-time **Remove ads — Tomodachi Dictionary**
   - International link: **$5 USD**
   - Optional second link for Brazil: **R$ 10 BRL** (or use PIX below + one USD link)
3. After creating, copy the link URL (looks like `https://buy.stripe.com/...`)

### Vercel env vars

Project → **Settings → Environment Variables** → redeploy:

| Variable | Example |
|----------|---------|
| `VITE_PAYMENT_URL_INTL` | `https://buy.stripe.com/xxxx` ($5 link) |
| `VITE_PAYMENT_URL_BR` | `https://buy.stripe.com/yyyy` (R$10 link, optional) |

If `VITE_PAYMENT_URL_BR` is empty, Brazilian users get the international link + the PIX QR on the options page.

Local `.env`:

```
VITE_PAYMENT_URL_INTL=https://buy.stripe.com/...
VITE_PAYMENT_URL_BR=https://buy.stripe.com/...
```

## 3. What users see in the app

**Home screen (ad strip):**

- **Pay $5** / **Pay R$ 10** → opens your Stripe link in a new tab (1 click)
- **I paid** → hides ads on this account immediately (honor system)
- **PIX / options** → short page with PIX QR (Brazil only) + free opt-out link

Configure payment URLs so most users never need the extra page.

## 4. Brazil PIX (already in the app)

`public/pix-qr.png` is shown only for accounts detected as Brazil (timezone / `pt-BR` language). Users can scan PIX, then tap **I paid**.

Replace the image anytime; keep it square (~200–400px).

## 5. Optional: auto-remove ads after Stripe (advanced)

Payment Links alone do **not** flip `ads_removed` automatically. Today users tap **I paid** after checkout.

To automate later:

1. Stripe → **Developers → Webhooks** → `checkout.session.completed`
2. Supabase **Edge Function** updates `user_profiles.ads_removed` for a matching email/metadata

That is extra work; the honor **I paid** button is fine for a small fan app.

## 6. Real ad network (optional)

The bottom strip is a placeholder. To show real ads later, embed AdSense (or similar) in `AdBanner.tsx` and still hide it when `ads_removed` is true.

## Checklist

- [ ] Supabase Email provider ON, Confirm email OFF
- [ ] `user_profiles` table created
- [ ] Stripe Payment Link(s) created
- [ ] `VITE_PAYMENT_URL_*` set on Vercel
- [ ] Redeploy
- [ ] Test: Pay → I paid → ad strip gone after refresh
