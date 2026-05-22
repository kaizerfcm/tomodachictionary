import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADMOB_TEST_BANNER_ID,
  getAdMobBannerId,
  shouldUseNativeAds,
} from './admobConfig';

describe('admobConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null on web', () => {
    vi.stubEnv('VITE_PLATFORM', 'web');
    expect(getAdMobBannerId()).toBeNull();
    expect(shouldUseNativeAds()).toBe(false);
  });

  it('returns banner id on android', () => {
    vi.stubEnv('VITE_PLATFORM', 'android');
    vi.stubEnv('VITE_ADMOB_BANNER_ID', '');
    expect(getAdMobBannerId()).toBe(ADMOB_TEST_BANNER_ID);
    expect(shouldUseNativeAds()).toBe(true);
  });
});
