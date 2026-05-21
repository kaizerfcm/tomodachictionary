# Android APK build guide (Tomodict)

This document is for an agent or developer packaging the **current React/Vite app** as an Android APK with **Google Play in-app purchase** for ad removal. Feature parity with web except:

- **No** “Remove ads without paying” link (`VITE_ALLOW_FREE_AD_REMOVAL=false`).
- **No** Stripe checkout in the APK (`VITE_PLATFORM=android`).
- Ads removed only after **Google Play** purchase (or restore), persisted to `user_profiles.ads_removed` when signed in.

## Prerequisites

- Node.js 20+
- Android Studio (SDK 34+, JDK 17)
- Google Play Console developer account
- Supabase project (same as web): `schema.sql` + `user_profiles.sql`
- Optional: Gemini API key still entered in-app (local storage)

## 1. Install dependencies

From repo root:

```bash
npm install
npm install @capacitor/core @capacitor/android @capacitor/app
npm install -D @capacitor/cli
```

## 2. Environment for Android builds

Use `.env.android` (or merge into `.env.android.local`):

```
VITE_PLATFORM=android
VITE_ALLOW_FREE_AD_REMOVAL=false
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# Leave VITE_PAYMENT_URL_INTL empty — Play billing only
```

Build:

```bash
npm run build:android
```

This runs tests, then `vite build --mode android` with `base: './'` for Capacitor.

## 3. Initialize Capacitor Android (first time only)

```bash
npx cap add android
npx cap sync android
```

`capacitor.config.ts` is already present:

- `appId`: `app.tomodict.editor`
- `appName`: `Tomodict`
- `webDir`: `dist`

After each web build:

```bash
npm run cap:sync
```

Open Android Studio:

```bash
npm run cap:open
```

## 4. Google Play product

1. Play Console → your app → **Monetize → Products → In-app products** (or **One-time products**).
2. Create non-consumable product ID: **`remove_ads`** (must match `PLAY_PRODUCT_REMOVE_ADS` in `src/lib/googlePlay.ts`).
3. Set price (e.g. tier close to $5 USD).
4. Activate product.

## 5. Native billing bridge (required work)

The web layer calls:

```ts
window.TomodictBilling.purchaseRemoveAds()
window.TomodictBilling.restorePurchases()
```

Implement these in Android (choose one approach):

### Option A — Custom Capacitor plugin (recommended)

1. Create a small Capacitor plugin `TomodictBilling` in the Android project.
2. Use **Google Play Billing Library 6+** (`BillingClient`).
3. On successful purchase of `remove_ads`:
   - Acknowledge purchase.
   - Resolve JS promise with `true`.
4. App calls `confirmPlayPurchase()` → sets `user_profiles.ads_removed` via existing Supabase client (user must be signed in).

### Option B — Community plugin

Evaluate `@capacitor-community/in-app-purchases` or similar; map product `remove_ads` to the same JS bridge shape above.

### Register bridge in WebView

In `MainActivity` (or plugin), expose:

```java
// Pseudocode — inject into WebView as TomodictBilling
@JavascriptInterface
public void purchaseRemoveAds() { ... }

@JavascriptInterface  
public void restorePurchases() { ... }
```

Or use Capacitor’s `registerPlugin` pattern so `window.TomodictBilling` is set on load.

Reference: `src/lib/googlePlay.ts`, `src/components/RemoveAdsPage.tsx`.

## 6. Signing & APK / AAB

In Android Studio:

1. **Build → Generate Signed Bundle / APK** → **Android App Bundle** (.aab) for Play Store.
2. Or APK for sideload testing.

Set `versionCode` / `versionName` in `android/app/build.gradle`.

## 7. Network / WebView

- Supabase and Gemini need **INTERNET** permission (Capacitor default).
- If using cleartext dev servers, adjust `android:usesCleartextTraffic` (not for production).

## 8. Testing checklist

- [ ] Sign up / sign in with email (Supabase, confirm email OFF).
- [ ] Island grid, editor, import/export JSON, avatars, AI (with API key).
- [ ] Ad strip visible on home grid when `ads_removed` is false.
- [ ] Remove ads screen shows **Buy (Google Play)** and **Restore** only — **no** free link.
- [ ] Purchase removes ads and persists after app restart (cloud account).
- [ ] Restore purchases works on reinstall.

## 9. Play Console compliance

- Privacy policy URL (can point to deployed Terms page).
- Declare billing permission.
- Target API level per Play requirements (update yearly).

## 10. Scripts reference

| Script | Purpose |
|--------|---------|
| `npm run build:android` | Production web bundle for Capacitor |
| `npm run cap:sync` | Build + copy into `android/` |
| `npm run cap:open` | Open Android Studio |

## 11. What not to ship in Android

- `public/pix-qr.png` (removed from web; not used).
- Stripe “I paid” flows.
- `VITE_ALLOW_FREE_AD_REMOVAL=true`.

## 12. Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Wrong `base` — must build with `--mode android` |
| Billing button errors | `TomodictBilling` not injected — finish §5 |
| Ads never disappear after purchase | User not signed in, or `setAdsRemoved` not called after purchase |
| Supabase auth fails | Check `VITE_SUPABASE_*` baked into build |

## File map

| Area | Path |
|------|------|
| Platform flags | `src/lib/platform.ts` |
| Play billing API | `src/lib/googlePlay.ts` |
| Remove ads UI | `src/components/RemoveAdsPage.tsx` |
| Profile flag | `supabase/user_profiles.sql` |
| Capacitor config | `capacitor.config.ts` |
