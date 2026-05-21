# Android build (Tomodict)

Guide for packaging the app as an APK/AAB with **Google Play** ad removal (no Stripe, no free remove-ads link on Android).

## Status

| Done | Pending |
|------|---------|
| Capacitor project (`android/`, `capacitor.config.ts`) | **Play Billing bridge** (`window.TomodictBilling`) |
| `npm run build:android` / `cap:sync` / `cap:open` | Play Console product `remove_ads` |
| Platform flags (`VITE_PLATFORM=android`) | Signed release AAB |

## Prerequisites

- Node.js 20+
- Android Studio (SDK 34+, JDK 17)
- Google Play Console account
- Same Supabase project as web (`schema.sql`, `user_profiles.sql`)

## 1. Install & env

```bash
npm install
```

Create `.env.android.local` (or use `.env.android` as a template):

```
VITE_PLATFORM=android
VITE_ALLOW_FREE_AD_REMOVAL=false
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Do not set `VITE_PAYMENT_URL_INTL` on Android builds.

## 2. Build web assets & sync

```bash
npm run cap:sync
```

Runs tests, `vite build --mode android` (`base: './'`), then copies into `android/`.

Open in Android Studio:

```bash
npm run cap:open
```

**First time only** (if `android/` is missing):

```bash
npx cap add android
npm run cap:sync
```

## 3. Google Play product

1. Play Console → **Monetize → In-app products** (one-time / non-consumable).
2. Product ID: **`remove_ads`** (must match `PLAY_PRODUCT_REMOVE_ADS` in `src/lib/googlePlay.ts`).
3. Activate and set price.

## 4. Native billing (required)

The UI calls:

```ts
window.TomodictBilling.purchaseRemoveAds()  // → Promise<boolean>
window.TomodictBilling.restorePurchases()   // → Promise<boolean>
```

Implement with **Google Play Billing Library 6+** via a small Capacitor plugin (recommended) or a vetted community plugin mapped to the same API.

On success, the app calls `confirmPlayPurchase()` → `user_profiles.ads_removed` in Supabase (user must be signed in).

References: `src/lib/googlePlay.ts`, `src/components/RemoveAdsPage.tsx`, `android/app/src/main/java/app/tomodict/editor/MainActivity.java`.

## 5. Release build

Android Studio → **Build → Generate Signed Bundle / APK** → prefer **AAB** for Play Store.

Bump `versionCode` / `versionName` in `android/app/build.gradle`.

## 6. Test checklist

- [ ] Email sign-in (Supabase: confirm email **off**)
- [ ] Grid, editor, JSON import/export, avatars, Gemini key in Configuration
- [ ] Ads on home when `ads_removed` is false
- [ ] Remove ads: **Buy** + **Restore** only (no Stripe / no free link)
- [ ] Purchase persists after restart when signed in

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen | Build with `--mode android`, then `cap:sync` |
| Billing errors | Finish §4 — bridge not wired |
| Ads stay after purchase | Sign in; check `confirmPlayPurchase` + `user_profiles` |
| Auth fails | Rebuild with correct `VITE_SUPABASE_*` |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build:android` | Android web bundle only |
| `npm run cap:sync` | Build + sync to `android/` |
| `npm run cap:open` | Android Studio |

## Web-only (not in APK)

Stripe checkout, free remove-ads link, community phrases Edge Function (optional; needs `community_phrases.sql` + deploy on Supabase).
