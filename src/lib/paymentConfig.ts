export interface PaymentConfig {
  priceLabel: string;
  /** Opens in a new tab — Stripe Payment Link, Ko-fi, etc. */
  paymentUrl: string | null;
  showPixQr: boolean;
}

export function getPaymentConfig(isBrazil: boolean): PaymentConfig {
  const intlUrl = import.meta.env.VITE_PAYMENT_URL_INTL?.trim() || null;
  const brUrl = import.meta.env.VITE_PAYMENT_URL_BR?.trim() || null;

  if (isBrazil) {
    return {
      priceLabel: 'R$ 10',
      paymentUrl: brUrl ?? intlUrl,
      showPixQr: true,
    };
  }

  return {
    priceLabel: '$5',
    paymentUrl: intlUrl,
    showPixQr: false,
  };
}

export function openPaymentLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
