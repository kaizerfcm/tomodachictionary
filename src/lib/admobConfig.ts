import { isAndroidApp } from './platform';

/** Google sample app ID — safe for dev; replace in production AdMob console. */
export const ADMOB_TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

/** Google sample banner unit — safe for dev. */
export const ADMOB_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

export function getAdMobBannerId(): string | null {
  if (!isAndroidApp()) return null;
  const id = import.meta.env.VITE_ADMOB_BANNER_ID?.trim();
  return id || ADMOB_TEST_BANNER_ID;
}

export function isAdMobTesting(): boolean {
  if (!isAndroidApp()) return false;
  return import.meta.env.VITE_ADMOB_TESTING !== 'false';
}

export function shouldUseNativeAds(): boolean {
  return isAndroidApp() && Boolean(getAdMobBannerId());
}
