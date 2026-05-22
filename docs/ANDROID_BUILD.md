# Android build (Tomodict) — agent handoff

**Context:** Web Tomodict is live on Vercel (`main`). The product owner is moving to **Android (Google Play)** next. This doc is the single source of truth for packaging the same React app as an APK/AAB.

**App ID:** `app.tomodict.editor` · **Capacitor 7** · **Vite `base: './'`** in android mode

---

## Priority for release

| Priority | Task | Why |
|----------|------|-----|
| **P0** | Play Console: app + `remove_ads` product + internal testing AAB | Billing only works after upload + activated product |
| **P0** | Production AdMob app/banner IDs in `.env.android.local` + `strings.xml` | Test IDs are dev-only |
| **P1** | Signed release AAB + license testers | Real purchase / restore QA |
| **P1** | `.env.android.local` with `VITE_SUPABASE_*` | Auth + cloud save + `ads_removed` sync |
| **P2** | Device smoke-test (see checklist below) | Touch UX + ads + billing |

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
| AdMob (home grid) | `@capacitor-community/admob`, `useAdMobBanner`, `src/lib/admobConfig.ts` |
| Play Billing native | `TomodictBillingPlugin.java` + `window.TomodictBilling` injection |
| Vercel Analytics | Skipped on Android builds (`App.tsx`) |

---

## What you still do outside the repo (blockers for store)

1. **Play Console** — create app, `remove_ads` in-app product (~**$4.99** US / **R$20** BR), license testers, upload signed AAB to **Internal testing**.
2. **AdMob console** — link app `app.tomodict.editor`, create banner unit, replace test IDs in `.env.android.local` and `android/app/src/main/res/values/strings.xml` (`admob_app_id`).
3. **Release signing** — upload keystore + Play App Signing.
4. **Store listing** — privacy policy URL, Data safety (ads + purchases + account), content rating, screenshots.

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
| `android/app/src/main/java/app/tomodict/editor/TomodictBillingPlugin.java` | Play Billing 7 + `window.TomodictBilling` |
| `src/hooks/useAdMobBanner.ts` | Native banner on home grid when ads enabled |

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

# AdMob (use Google test IDs until you have production units)
VITE_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
VITE_ADMOB_BANNER_ID=ca-app-pub-3940256099942544/6300978111
VITE_ADMOB_TESTING=true
```

**Do not set** `VITE_PAYMENT_URL_INTL` to a Stripe URL on Android builds.

Copy [`.env.android`](.env.android) → **`.env.android.local`** (gitignored) and fill Supabase + production AdMob IDs before release.

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

## AdMob (home grid)

- Plugin: `@capacitor-community/admob`
- Shown when `showGrid && !adsRemoved` via `useAdMobBanner` in `AppMain.tsx`
- WebView CTA strip: `AdBanner` (Remove ads buttons only; ad creative is native)
- Android manifest: `com.google.android.gms.ads.APPLICATION_ID` → `@string/admob_app_id`
- Before production: replace test app/banner IDs in env + `strings.xml`

---

## P0: Google Play Billing bridge

Implemented in **`TomodictBillingPlugin`** (Billing Library 7.1). Registered from `MainActivity`.

### Contract (used by TypeScript)

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

Constants must stay in sync:

- Code: `PLAY_PRODUCT_REMOVE_ADS = 'remove_ads'` in `src/lib/googlePlay.ts`
- Play Console → Monetize → Products → in-app product ID **`remove_ads`**

### Play Console setup (release checklist)

1. **Developer account** ($25 one-time) → create app package **`app.tomodict.editor`**.
2. **Monetize → In-app products** → one-time → ID **`remove_ads`**:
   - US: **$4.99** (closest tier to $5)
   - Brazil: **R$ 20,00**
   - **Activate** the product.
3. **Setup → License testing** — add tester Gmail accounts.
4. **Release → Testing → Internal testing** — upload first **signed AAB** (billing needs a published testing track).
5. **Store presence** — icon, screenshots, descriptions.
6. **Policy** — privacy policy URL; **Data safety** (ads, in-app purchases, email account); **Content rating** questionnaire.
7. **Monetization setup** — declare ads; link AdMob app to Play app in AdMob console.

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

- [ ] Home grid shows **AdMob test banner** (bottom) when `ads_removed` is false
- [ ] CTA strip: **Remove ads** opens purchase page; **no** Stripe; **no** free remove link
- [ ] Buy `remove_ads` while signed in → native banner hidden → `ads_removed` true in Supabase
- [ ] Reinstall → sign in → **Restore purchase** → ads stay off
- [ ] Purchase while signed out → local ads off; after sign-in + Restore, cloud flag syncs

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

## Release signing (AAB)

1. Android Studio → **Build → Generate Signed Bundle / APK** → **Android App Bundle**.
2. Create upload keystore (backup passwords securely; never commit).
3. Play Console → **App signing** → opt into Play App Signing.
4. Bump `versionCode` / `versionName` in `android/app/build.gradle` per upload.

---

## Troubleshooting (AdMob)

| Symptom | Likely fix |
|---------|------------|
| No banner / “no fill” | Use test ad unit IDs; check `admob_app_id` in manifest |
| Banner overlaps grid | Confirm `app--with-native-ads` padding; banner is `BOTTOM_CENTER` |
| Consent blocks ads in EU test | UMP form declined — normal in test; verify production consent config |

**Web `main` is ahead:** do not revert web-only behavior; only gate with `isAndroidApp()` where needed.

_Last updated: AdMob + TomodictBilling plugin in repo; Play Console steps remain manual._
