import { isAndroidApp } from './platform';

/** Product ID in Google Play Console (non-consumable). */
export const PLAY_PRODUCT_REMOVE_ADS = 'remove_ads';

declare global {
  interface Window {
    TomodictBilling?: {
      purchaseRemoveAds: () => Promise<boolean>;
      restorePurchases: () => Promise<boolean>;
    };
  }
}

/**
 * Android only — implemented via Capacitor/custom plugin (see docs/ANDROID_BUILD.md).
 */
export async function purchaseRemoveAdsOnPlay(): Promise<boolean> {
  if (!isAndroidApp()) {
    throw new Error('Google Play billing is only available in the Android app.');
  }
  const billing = window.TomodictBilling;
  if (!billing?.purchaseRemoveAds) {
    throw new Error(
      'Google Play billing is not connected. Finish the native billing setup in docs/ANDROID_BUILD.md.',
    );
  }
  return billing.purchaseRemoveAds();
}

export async function restorePlayPurchases(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  const billing = window.TomodictBilling;
  if (!billing?.restorePurchases) return false;
  return billing.restorePurchases();
}
