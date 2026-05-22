import { usesGooglePlayBilling, usesStripeWebCheckout } from './platform';

export interface PaymentConfig {
  priceLabel: string;
  paymentUrl: string | null;
}

const DEFAULT_STRIPE_URL =
  'https://donate.stripe.com/28E8wQ3M29A2aC82hnbjW00';

export function getPaymentConfig(): PaymentConfig {
  if (usesGooglePlayBilling()) {
    return {
      priceLabel: 'about $5 / R$20',
      paymentUrl: null,
    };
  }

  const paymentUrl =
    import.meta.env.VITE_PAYMENT_URL_INTL?.trim() || DEFAULT_STRIPE_URL;

  return {
    priceLabel: 'once',
    paymentUrl,
  };
}

export function openPaymentLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function usesWebStripe(): boolean {
  return usesStripeWebCheckout();
}
