import { useCallback, useEffect, useState } from 'react';
import { detectAccountCountry, type AccountCountry } from '../lib/detectCountry';
import { getLocalAdsRemoved, setLocalAdsRemoved } from '../lib/localAds';
import {
  ensureUserProfile,
  loadUserProfile,
  setAdsRemoved as persistAdsRemoved,
} from '../lib/userProfile';
import { isSupabaseConfigured } from '../lib/supabase';

export function useUserProfile(userId: string | null | undefined) {
  const [adsRemoved, setAdsRemovedState] = useState(() =>
    userId ? false : getLocalAdsRemoved(),
  );
  const [countryCode, setCountryCode] = useState<AccountCountry | null>(null);
  const [loading, setLoading] = useState(Boolean(userId && isSupabaseConfigured()));

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setAdsRemovedState(getLocalAdsRemoved());
      setCountryCode(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let profile = await loadUserProfile(userId);
        if (!profile) {
          profile = await ensureUserProfile(userId, detectAccountCountry());
        }
        if (!cancelled) {
          setAdsRemovedState(profile.adsRemoved);
          setCountryCode(profile.countryCode ?? detectAccountCountry());
        }
      } catch {
        if (!cancelled) {
          setAdsRemovedState(false);
          setCountryCode(detectAccountCountry());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const isBrazil = countryCode === 'BR';

  return {
    adsRemoved,
    isBrazil,
    loading,
    setAdsRemoved,
  };
}
