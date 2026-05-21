import { useCallback, useEffect, useState } from 'react';
import { detectAccountCountry } from '../lib/detectCountry';
import { getLocalAdsRemoved, setLocalAdsRemoved } from '../lib/localAds';
import { isAndroidApp } from '../lib/platform';
import {
  ensureUserProfile,
  loadUserProfile,
  setAdsRemoved as persistAdsRemoved,
} from '../lib/userProfile';
import { isSupabaseConfigured } from '../lib/supabase';

async function loadProfileState(userId: string) {
  let profile = await loadUserProfile(userId);
  if (!profile) {
    profile = await ensureUserProfile(userId, detectAccountCountry());
  }
  return profile;
}

export function useUserProfile(userId: string | null | undefined) {
  const [adsRemoved, setAdsRemovedState] = useState(() =>
    userId ? false : getLocalAdsRemoved(),
  );
  const [loading, setLoading] = useState(Boolean(userId && isSupabaseConfigured()));

  const applyProfile = useCallback((adsRemoved: boolean) => {
    setAdsRemovedState(adsRemoved);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      applyProfile(getLocalAdsRemoved());
      return;
    }
    try {
      const profile = await loadProfileState(userId);
      applyProfile(profile.adsRemoved);
    } catch {
      /* keep current state */
    }
  }, [applyProfile, userId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      applyProfile(getLocalAdsRemoved());
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const profile = await loadProfileState(userId);
        if (!cancelled) {
          applyProfile(profile.adsRemoved);
        }
      } catch {
        if (!cancelled) applyProfile(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyProfile, userId]);

  /** Free opt-out (web) or after verified Play purchase / Stripe webhook. */
  const setAdsRemoved = useCallback(
    async (removed: boolean) => {
      setAdsRemovedState(removed);
      if (userId && isSupabaseConfigured()) {
        await persistAdsRemoved(userId, removed);
      } else {
        setLocalAdsRemoved(removed);
      }
    },
    [userId],
  );

  const confirmPlayPurchase = useCallback(async () => {
    if (!isAndroidApp()) return;
    await setAdsRemoved(true);
  }, [setAdsRemoved]);

  return {
    adsRemoved,
    loading,
    setAdsRemoved,
    refreshProfile,
    confirmPlayPurchase,
  };
}
