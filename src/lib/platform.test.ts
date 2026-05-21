import { describe, expect, it, vi } from 'vitest';
import { canRemoveAdsForFree, isAndroidApp } from './platform';

describe('platform', () => {
  it('defaults to web with free removal allowed', () => {
    vi.stubEnv('VITE_PLATFORM', 'web');
    vi.stubEnv('VITE_ALLOW_FREE_AD_REMOVAL', 'true');
    expect(isAndroidApp()).toBe(false);
    expect(canRemoveAdsForFree()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('android build disables free removal', () => {
    vi.stubEnv('VITE_PLATFORM', 'android');
    expect(isAndroidApp()).toBe(true);
    expect(canRemoveAdsForFree()).toBe(false);
    vi.unstubAllEnvs();
  });
});
