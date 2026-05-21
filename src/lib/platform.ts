/** `web` (default) or `android` (Capacitor APK). */
export type AppPlatform = 'web' | 'android';

export function getAppPlatform(): AppPlatform {
  return import.meta.env.VITE_PLATFORM === 'android' ? 'android' : 'web';
}

export function isAndroidApp(): boolean {
  return getAppPlatform() === 'android';
}

/** Web-only: optional free ad removal link. Disabled on Android builds. */
export function canRemoveAdsForFree(): boolean {
  if (isAndroidApp()) return false;
  return import.meta.env.VITE_ALLOW_FREE_AD_REMOVAL !== 'false';
}

export function usesStripeWebCheckout(): boolean {
  return !isAndroidApp();
}

export function usesGooglePlayBilling(): boolean {
  return isAndroidApp();
}
