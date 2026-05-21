# Monetization (Tomodict web)

## User flow

1. Home → **Pay to remove ads** → Stripe checkout (donate link).
2. User pays with the **same email** as their Tomodict account.
3. Stripe webhook sets `user_profiles.ads_removed = true`.
4. User returns to the app → ads disappear (profile refreshes on window focus).

Optional: **Remove ads without paying** (web only, `VITE_ALLOW_FREE_AD_REMOVAL=true`).

No honor-system “I paid” button and no PIX QR on web.

## Vercel environment variables

Set in Vercel (or sync via **Vercel ↔ Supabase integration**):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Cloud sync + auth |
| `VITE_SUPABASE_ANON_KEY` | Browser client (public) |
| `VITE_PAYMENT_URL_INTL` | Stripe donate / payment link |
| `VITE_ALLOW_FREE_AD_REMOVAL` | `true` to show free remove-ads link |

Example:

```
VITE_PAYMENT_URL_INTL=https://donate.stripe.com/28E8wQ3M29A2aC82hnbjW00
VITE_ALLOW_FREE_AD_REMOVAL=true
```

The Vercel–Supabase integration is helpful: it keeps `VITE_SUPABASE_*` aligned with your project. It does **not** deploy Edge Functions or set Stripe secrets — those stay in Supabase.

**Never** put `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_WEBHOOK_SECRET` in Vercel (frontend). Only in Supabase function secrets.

## Stripe payment link

Default URL (also in code fallback):

`https://donate.stripe.com/28E8wQ3M29A2aC82hnbjW00`

Ensure the link collects the payer **email** so the webhook can match accounts.

## Stripe webhook (required for paid ad removal)

Without the webhook, paying does **not** remove ads automatically.

### Supabase secrets

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
```

`SUPABASE_URL` is injected automatically in Edge Functions.

### Deploy function

```bash
npm run supabase:deploy-webhook
```

Or:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Stripe Dashboard

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`
3. Event: `checkout.session.completed`
4. Signing secret → `STRIPE_WEBHOOK_SECRET`

### Verify webhook

In Stripe → Webhooks → your endpoint → **Send test event** (`checkout.session.completed`). Expect HTTP **200**. Check Supabase → Edge Functions → Logs if it fails.

For a real test:

1. Create a Tomodict account with email `you@example.com`.
2. Pay via the donate link using the **same** email.
3. Return to the app and focus the tab — ads should hide.

If signature verification fails (400), redeploy after updating the function and confirm the secret matches the endpoint’s signing secret.

## Supabase Auth

- Email provider **ON**
- **Confirm email** **OFF**

## Database

Run in SQL Editor if not already applied:

- `supabase/schema.sql` — island data
- `supabase/user_profiles.sql` — `ads_removed` flag

## Android

See **`docs/ANDROID_BUILD.md`**. Play billing only — no Stripe link on APK.

## Production checklist

- [x] `VITE_PAYMENT_URL_INTL` on Vercel
- [x] `VITE_SUPABASE_*` on Vercel (integration or manual)
- [x] Webhook deployed + secrets set
- [ ] Test payment with signed-in account email
- [ ] Ads hidden after return (focus tab or refresh)
