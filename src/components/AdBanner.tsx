import type { PaymentConfig } from '../lib/paymentConfig';
import { openPaymentLink } from '../lib/paymentConfig';

interface AdBannerProps {
  payment: PaymentConfig;
  onConfirmPaid: () => void;
  onMoreOptions: () => void;
}

export function AdBanner({
  payment,
  onConfirmPaid,
  onMoreOptions,
}: AdBannerProps) {
  const { priceLabel, paymentUrl } = payment;

  return (
    <aside className="ad-banner" aria-label="Support">
      <span className="ad-banner-text">Ads help cover hosting</span>
      <div className="ad-banner-actions">
        {paymentUrl ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openPaymentLink(paymentUrl)}
          >
            Pay {priceLabel}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={onMoreOptions}>
            Remove ads
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onConfirmPaid}>
          I paid
        </button>
        {paymentUrl && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onMoreOptions}>
            PIX / options
          </button>
        )}
      </div>
    </aside>
  );
}
