export type AppPlatform = 'web';

export function getAppPlatform(): AppPlatform {
  return 'web';
}

export function isAndroidApp(): boolean {
  return false;
}

export function canRemoveAdsForFree(): boolean {
  return import.meta.env.VITE_ALLOW_FREE_AD_REMOVAL !== 'false';
}

export function usesStripeWebCheckout(): boolean {
  return true;
}

export function usesGooglePlayBilling(): boolean {
  return false;
}
