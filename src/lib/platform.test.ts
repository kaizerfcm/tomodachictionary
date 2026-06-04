import { describe, expect, it, vi } from 'vitest';
import {
  canRemoveAdsForFree,
  getAppPlatform,
  isAndroidApp,
  usesGooglePlayBilling,
  usesStripeWebCheckout,
} from './platform';

describe('platform', () => {
  it('runs as web', () => {
    expect(getAppPlatform()).toBe('web');
    expect(isAndroidApp()).toBe(false);
    expect(usesGooglePlayBilling()).toBe(false);
    expect(usesStripeWebCheckout()).toBe(true);
  });

  it('allows free ad removal by default on web', () => {
    vi.stubEnv('VITE_ALLOW_FREE_AD_REMOVAL', undefined);
    expect(canRemoveAdsForFree()).toBe(true);
  });
});
