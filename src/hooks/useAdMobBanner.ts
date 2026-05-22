import { useEffect, useRef } from 'react';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';
import { getAdMobBannerId, isAdMobTesting, shouldUseNativeAds } from '../lib/admobConfig';

let initialized = false;

async function ensureAdMobReady(): Promise<void> {
  if (initialized) return;
  await AdMob.initialize({
    initializeForTesting: isAdMobTesting(),
  });
  try {
    const consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && !consent.canRequestAds) {
      await AdMob.showConsentForm();
    }
  } catch {
    /* UMP optional; ads may still load in test mode */
  }
  initialized = true;
}

/**
 * Shows a native AdMob banner on Android when `visible` is true (home grid only).
 */
export function useAdMobBanner(visible: boolean): void {
  const showingRef = useRef(false);

  useEffect(() => {
    if (!shouldUseNativeAds()) return;

    let cancelled = false;

    const hide = async () => {
      if (!showingRef.current) return;
      try {
        await AdMob.hideBanner();
        await AdMob.removeBanner();
      } catch {
        /* already hidden */
      }
      showingRef.current = false;
    };

    const show = async () => {
      const adId = getAdMobBannerId();
      if (!adId || cancelled) return;
      await ensureAdMobReady();
      if (cancelled) return;
      if (showingRef.current) {
        await hide();
      }
      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: isAdMobTesting(),
      });
      showingRef.current = true;
    };

    if (visible) {
      void show();
    } else {
      void hide();
    }

    return () => {
      cancelled = true;
      void hide();
    };
  }, [visible]);
}
