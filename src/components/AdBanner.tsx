import type { PaymentConfig } from '../lib/paymentConfig';
import { openPaymentLink, usesWebStripe } from '../lib/paymentConfig';
import { shouldUseNativeAds } from '../lib/admobConfig';
import { usesGooglePlayBilling } from '../lib/platform';

interface AdBannerProps {
  payment: PaymentConfig;
  onOpenRemoveAds: () => void;
}

export function AdBanner({ payment, onOpenRemoveAds }: AdBannerProps) {
  const { paymentUrl, priceLabel } = payment;
  const nativeAds = shouldUseNativeAds();

  return (
    <aside
      className={`ad-banner${nativeAds ? ' ad-banner--native' : ''}`}
      aria-label="Advertisement"
    >
      {!nativeAds && (
        <span className="ad-banner-text">Ads help cover hosting</span>
      )}
      <div className="ad-banner-actions">
        {usesWebStripe() && paymentUrl && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openPaymentLink(paymentUrl)}
          >
            Pay to remove ads ({priceLabel})
          </button>
        )}
        {usesGooglePlayBilling() && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenRemoveAds}
          >
            Remove ads (Play Store)
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenRemoveAds}>
          Remove ads…
        </button>
      </div>
    </aside>
  );
}
