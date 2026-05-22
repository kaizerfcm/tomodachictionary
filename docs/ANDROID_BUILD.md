# Android build (Tomodict) — agent handoff

**Context:** Web Tomodict is live on Vercel (`main`). The product owner is moving to **Android (Google Play)** next. This doc is the single source of truth for packaging the same React app as an APK/AAB.

**App ID:** `app.tomodict.editor` · **Capacitor 7** · **Vite `base: './'`** in android mode

---

## Priority for the next agent

| Priority | Task | Why |
|----------|------|-----|
| **P0** | Implement `window.TomodictBilling` (Play Billing Library 6+) | UI already calls it; without it, “Buy remove ads” throws |
| **P0** | Create & activate Play product `remove_ads` (non-consumable) | Must match `PLAY_PRODUCT_REMOVE_ADS` in code |
| **P1** | Signed release AAB + internal testing track | First Play upload |
| **P1** | `.env.android.local` with real `VITE_SUPABASE_*` | Auth + cloud save on device |
| **P2** | Smoke-test full editor on phone (see checklist) | Touch UX already tuned partially for mobile |
| **P3** | Optional: hide `@vercel/analytics` on Android | Harmless but useless in WebView |

**Not required for v1 Android:** Stripe, seed files (`public/seed.md` — removed), Vercel deploy, community phrases (works if Supabase Edge Function is deployed; same as web).

---

## What is already done (repo)

| Area | Status |
|------|--------|
| Capacitor Android project | `android/`, `capacitor.config.ts`, default `MainActivity` extends `BridgeActivity` |
| Build pipeline | `npm run build:android`, `npm run cap:sync`, `npm run cap:open` |
| Platform split | `VITE_PLATFORM=android` → `src/lib/platform.ts` |
| Ads / monetization UI | `RemoveAdsPage`: Play **Buy** + **Restore** only; no Stripe, no free remove-ads link |
| Play purchase persistence | `confirmPlayPurchase()` → `user_profiles.ads_removed` via `useUserProfile.ts` (user must be signed in) |
| Web features in shared bundle | Characters, phrases, paired nickname cards, batch “Generate missing” nicknames, optional **Extra** field for AI, JSON import/export, Gemini key in Configuration, local + cloud storage |
| Mobile web CSS | `@media (max-width: 768px)`: sidebar **islander list hidden** (grid picks characters); compact toolbar |
| SDK | `compileSdk` / `targetSdk` **35**, `minSdk` **23** (`android/variables.gradle`) |
| Version | `versionCode 1`, `versionName "1.0"` (`android/app/build.gradle`) — bump before each Play upload |

---

## What is NOT done (blockers)

1. **Native billing bridge** — `window.TomodictBilling` is declared in `src/lib/googlePlay.ts` but **never injected** from Java/Kotlin. `MainActivity.java` is still the stock Capacitor stub.
2. **Play Console** — product `remove_ads`, testers, signed app if not set up yet.
3. **Release signing** — keystore + Play App Signing as needed.

---

## Architecture (quick map)

```
React (src/) ──vite build --mode android──► dist/
                                              │
                                    npx cap sync android
                                              │
                                    android/app/src/main/assets/public
                                              │
                                    WebView (BridgeActivity)
```

**Key files**

| File | Role |
|------|------|
| `vite.config.ts` | `base: './'` when `mode === 'android'` (required for asset paths) |
| `src/lib/platform.ts` | `isAndroidApp()`, `usesGooglePlayBilling()`, `canRemoveAdsForFree()` |
| `src/lib/googlePlay.ts` | `PLAY_PRODUCT_REMOVE_ADS`, `purchaseRemoveAdsOnPlay()`, `restorePlayPurchases()` |
| `src/lib/paymentConfig.ts` | Android → no Stripe URL |
| `src/components/RemoveAdsPage.tsx` | Play purchase / restore buttons |
| `src/hooks/useUserProfile.ts` | `confirmPlayPurchase()` sets `ads_removed` in Supabase |
| `android/app/src/main/java/app/tomodict/editor/MainActivity.java` | **Extend here** (or plugin) for billing |

---

## Environment variables (Android build)

Vite reads env at **build time**. Use a local file **not committed** (`.env.*` is gitignored except `.env.example`).

Create **`.env.android.local`** (or export vars in CI):

```env
VITE_PLATFORM=android
VITE_ALLOW_FREE_AD_REMOVAL=false

# Required for sign-in + cloud sync on device
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Leave empty on Android — Stripe is web-only
VITE_PAYMENT_URL_INTL=
```

**Do not set** `VITE_PAYMENT_URL_INTL` to a Stripe URL on Android builds.

Template in repo (fill locally): copy from `.env.android` if present on disk, or use the block above.

**Supabase Auth (required for cloud + ads flag):** Dashboard → Authentication → Providers → Email → **Confirm email OFF** (same as web), or sign-up succeeds but session fails in-app.

**SQL (once per project):** run `supabase/schema.sql` and `supabase/user_profiles.sql` (see `docs/SUPABASE_SECURITY.md`).

---

## Build & run on device

```bash
npm install

# First time only, if android/ is broken or missing:
# npx cap add android

npm run cap:sync    # test + build:android + cap sync
npm run cap:open    # Android Studio → Run on device/emulator
```

**Debug loop:** change TS/React → `npm run cap:sync` → rerun app (no need to re-add platform).

**White screen?** Almost always wrong `base` or stale assets → rebuild with `--mode android`, then `cap:sync`.

---

## P0: Google Play Billing bridge

### Contract (already used by TypeScript)

```ts
// Injected on Android WebView only — see src/lib/googlePlay.ts
window.TomodictBilling = {
  purchaseRemoveAds: () => Promise<boolean>,  // true = user owns remove_ads
  restorePurchases: () => Promise<boolean>,   // true = restore found entitlement
};
```

Flow:

1. User taps **Buy remove ads (Google Play)** → `purchaseRemoveAdsOnPlay()` → native purchase.
2. On success → `onPaymentComplete` → `confirmPlayPurchase()` → `user_profiles.ads_removed = true`.
3. **Restore** must query Play for existing ownership of `remove_ads` and return `true` if entitled.

User should be **signed in** before purchase so the flag attaches to their Supabase profile (UI warns if not).

### Recommended implementation

**Option A (preferred):** Small **Capacitor plugin** (e.g. `TomodictBillingPlugin`) in `android/` using [Google Play Billing Library 6+](https://developer.android.com/google/play/billing), product ID **`remove_ads`**, type **one-time / non-consumable** (INAPP non-consumable).

**Option B:** Vetted community Capacitor billing plugin, as long as it exposes the same `window.TomodictBilling` shape (inject in `MainActivity.onStart` via `WebView` evaluateJavascript or Capacitor plugin bridge).

**Option C:** Inline in `MainActivity` + `JavascriptInterface` — faster hack, less maintainable.

Constants must stay in sync:

- Code: `PLAY_PRODUCT_REMOVE_ADS = 'remove_ads'` in `src/lib/googlePlay.ts`
- Play Console → Monetize → Products → in-app product ID **`remove_ads`**

### Play Console setup

1. Create app (or use existing) with package **`app.tomodict.editor`**.
2. **Monetize → In-app products** → one-time / non-consumable → ID **`remove_ads`**, set price, **Activate**.
3. Add license testers for sandbox purchases.
4. Upload AAB to **Internal testing** before production.

---

## Release build

1. Android Studio → **Build → Generate Signed Bundle / APK** → **Android App Bundle (AAB)** for Play.
2. Bump in `android/app/build.gradle`:
   - `versionCode` (integer, monotonic)
   - `versionName` (user-visible, e.g. `1.1`)
3. Play Console → Production or Internal testing → upload AAB.

---

## Feature parity checklist (test on real device)

Use a build with valid `VITE_SUPABASE_*` and billing wired.

### Core

- [ ] Welcome → Continue locally **or** Sign up / Sign in
- [ ] Grid: add character, sort, open editor
- [ ] Editor: name, **Extra** (collapsible), avatar, phrases, nicknames (paired cards)
- [ ] JSON export / import (sidebar toolbar icons)
- [ ] Configuration: Gemini API key; theme
- [ ] Sign out / sign in; cloud island persists after restart

### AI (user’s Gemini key in app)

- [ ] Generate phrase (✨), batch **Generate missing** nicknames
- [ ] Add character → Generate with Gemini → review modal → add
- [ ] Bottom toast: spinner while generating; success/error with **Close**

### Ads & billing

- [ ] Home grid shows ad strip when `ads_removed` is false
- [ ] Remove ads: **Buy** and **Restore** visible; **no** Stripe link; **no** “remove without paying”
- [ ] After purchase (signed in): ads gone; `ads_removed` true in Supabase
- [ ] After reinstall + Restore: ads still removed when signed in

### Mobile UX (already in CSS; verify feel)

- [ ] Sidebar: **no** duplicate islander list (grid is primary picker)
- [ ] Modals: bottom-sheet style; large **Close** on review modal
- [ ] Keyboard does not break Extra textarea (spaces save correctly)

---

## Web vs Android differences

| Feature | Web (Vercel) | Android APK |
|---------|----------------|-------------|
| Remove ads | Stripe webhook + optional free link | Google Play `remove_ads` only |
| Payments env | `VITE_PAYMENT_URL_INTL` | Must be empty / unset |
| Analytics | `@vercel/analytics` in `App.tsx` | Optional to gate with `!isAndroidApp()` |
| Deploy | `git push` → Vercel | `cap:sync` + Play upload |
| Community phrases | Edge Function + signed in | Same if Supabase configured |
| Seed files | Removed | N/A |

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| White screen after launch | `npm run cap:sync`; confirm `vite.config.ts` `base: './'` for android mode |
| “Google Play billing is not connected” | Implement § P0 bridge; rebuild/sync |
| Purchase succeeds but ads remain | User not signed in; or `confirmPlayPurchase` / `user_profiles` update failed — check Supabase logs |
| Auth errors on device | Rebuild with correct `VITE_SUPABASE_*`; confirm email provider settings |
| Gemini works on web but not APK | Same — API key is localStorage in WebView; user must set key in Configuration |
| Play “item unavailable” | Product ID mismatch, not activated, or app not uploaded to testing track |

---

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run build:android` | `tsc` + vitest + `vite build --mode android` |
| `npm run cap:sync` | Android build + `npx cap sync android` |
| `npm run cap:open` | Open Android Studio |

---

## Related docs

- [MONETIZATION.md](./MONETIZATION.md) — Stripe + webhook (web only)
- [SUPABASE_SECURITY.md](./SUPABASE_SECURITY.md) — RLS, Edge Functions, community phrases
- [README.md](../README.md) — general dev entry

---

## Suggested PR / task breakdown for Android milestone

1. `feat(android): TomodictBilling Capacitor plugin` — purchase + restore + inject `window.TomodictBilling`
2. `docs: Play Console checklist` — screenshots / internal testing notes (optional)
3. `chore(android): bump versionCode` — per release
4. Optional: `fix(android): skip Vercel Analytics when VITE_PLATFORM=android`

**Web `main` is ahead:** do not revert web-only behavior; only gate with `isAndroidApp()` where needed.

_Last updated: handoff for Android focus — web on Vercel includes Extra field, paired nicknames, no seed bootstrap, mobile sidebar list hidden._
