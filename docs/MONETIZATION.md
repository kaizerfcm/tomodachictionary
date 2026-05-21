# Monetization (Tomodict web)

## User flow (minimal clicks)

1. Home screen → **Pay to remove ads** → Stripe checkout (your donate link).
2. User pays with the **same email** as their Tomodict account.
3. Stripe webhook sets `user_profiles.ads_removed = true`.
4. User returns to the app → ads disappear (auto-refresh on window focus).

Optional: **Remove ads without paying** (web only, env `VITE_ALLOW_FREE_AD_REMOVAL=true`).

There is **no** “I paid” honor button and **no** PIX QR on web.

## 1. Stripe donate / payment link

Default URL (also in code fallback):

`https://donate.stripe.com/28E8wQ3M29A2aC82hnbjW00`

Vercel env:

```
VITE_PAYMENT_URL_INTL=https://donate.stripe.com/28E8wQ3M29A2aC82hnbjW00
VITE_ALLOW_FREE_AD_REMOVAL=true
```

## 2. Stripe webhook (required for paid ad removal)

Without the webhook, paying does **not** remove ads automatically.

### Supabase

1. Run `supabase/user_profiles.sql` if not done.
2. Deploy function:

```bash
supabase login
supabase link --project-ref YOUR_REF
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
supabase functions deploy stripe-webhook --no-verify-jwt
```

`SUPABASE_URL` is provided automatically in Edge Functions.

### Stripe Dashboard

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`
3. Event: `checkout.session.completed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Matching accounts

Checkout email must match the user’s **Supabase Auth email**. Tell users to sign in with that email before or after paying.

## 3. Supabase Auth

- Email provider **ON**
- **Confirm email** **OFF**

## 4. Android

See **`docs/ANDROID_BUILD.md`**. Android uses **Google Play** billing only — no Stripe link, no free remove-ads link.

## Checklist

- [ ] `VITE_PAYMENT_URL_INTL` on Vercel
- [ ] Webhook deployed + secret set
- [ ] Test payment with signed-in account email
- [ ] Ads hidden after return (focus tab or refresh)
