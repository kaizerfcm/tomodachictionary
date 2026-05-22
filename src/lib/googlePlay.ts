import { registerPlugin } from '@capacitor/core';
import { isAndroidApp } from './platform';

/** Product ID in Google Play Console (non-consumable). */
export const PLAY_PRODUCT_REMOVE_ADS = 'remove_ads';

interface TomodictBillingPlugin {
  purchaseRemoveAds(): Promise<{ owned: boolean }>;
  restorePurchases(): Promise<{ owned: boolean }>;
}

const TomodictBillingNative = registerPlugin<TomodictBillingPlugin>('TomodictBilling');

declare global {
  interface Window {
    TomodictBilling?: {
      purchaseRemoveAds: () => Promise<boolean>;
      restorePurchases: () => Promise<boolean>;
    };
  }
}

function getBilling() {
  return window.TomodictBilling;
}

async function purchaseViaPlugin(): Promise<boolean> {
  try {
    const { owned } = await TomodictBillingNative.purchaseRemoveAds();
    return owned;
  } catch {
    const billing = getBilling();
    if (billing?.purchaseRemoveAds) {
      return billing.purchaseRemoveAds();
    }
    throw new Error(
      'Google Play billing is not connected. Finish the native billing setup in docs/ANDROID_BUILD.md.',
    );
  }
}

async function restoreViaPlugin(): Promise<boolean> {
  try {
    const { owned } = await TomodictBillingNative.restorePurchases();
    return owned;
  } catch {
    const billing = getBilling();
    if (billing?.restorePurchases) {
      return billing.restorePurchases();
    }
    return false;
  }
}

/**
 * Android only — TomodictBilling Capacitor plugin (see docs/ANDROID_BUILD.md).
 */
export async function purchaseRemoveAdsOnPlay(): Promise<boolean> {
  if (!isAndroidApp()) {
    throw new Error('Google Play billing is only available in the Android app.');
  }
  return purchaseViaPlugin();
}

export async function restorePlayPurchases(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  return restoreViaPlugin();
}
