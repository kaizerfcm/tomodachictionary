import type { AccountCountry } from './detectCountry';
import { getSupabase } from './supabase';

const TABLE = 'user_profiles';

export interface UserProfile {
  adsRemoved: boolean;
  countryCode: AccountCountry | null;
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('ads_removed, country_code')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    adsRemoved: Boolean(data.ads_removed),
    countryCode:
      data.country_code === 'BR'
        ? 'BR'
        : data.country_code
          ? 'INTL'
          : null,
  };
}

export async function ensureUserProfile(
  userId: string,
  country: AccountCountry,
): Promise<UserProfile> {
  const supabase = getSupabase();
  const existing = await loadUserProfile(userId);
  if (existing) return existing;

  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    ads_removed: false,
    country_code: country,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  return { adsRemoved: false, countryCode: country };
}

export async function setAdsRemoved(
  userId: string,
  adsRemoved: boolean,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      ads_removed: adsRemoved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
