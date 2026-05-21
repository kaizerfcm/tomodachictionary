import { describe, expect, it, vi } from 'vitest';
import { getPaymentConfig } from './paymentConfig';

describe('getPaymentConfig', () => {
  it('uses Stripe URL on web', () => {
    vi.stubEnv('VITE_PLATFORM', 'web');
    vi.stubEnv('VITE_PAYMENT_URL_INTL', '');
    const config = getPaymentConfig();
    expect(config.paymentUrl).toContain('donate.stripe.com');
    vi.unstubAllEnvs();
  });

  it('has no payment URL on Android', () => {
    vi.stubEnv('VITE_PLATFORM', 'android');
    const config = getPaymentConfig();
    expect(config.paymentUrl).toBeNull();
    vi.unstubAllEnvs();
  });
});
