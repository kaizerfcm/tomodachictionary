import type { PaymentConfig } from '../lib/paymentConfig';
import { openPaymentLink } from '../lib/paymentConfig';

interface RemoveAdsPageProps {
  payment: PaymentConfig;
  hasAccount: boolean;
  onBack: () => void;
  onConfirmPaid: () => void;
  onRemoveFree: () => void;
}

export function RemoveAdsPage({
  payment,
  hasAccount,
  onBack,
  onConfirmPaid,
  onRemoveFree,
}: RemoveAdsPageProps) {
  const { priceLabel, paymentUrl, showPixQr } = payment;

  return (
    <div className="config-page remove-ads-page">
      <header className="config-header">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Remove ads — {priceLabel} once</h1>
      </header>

      <div className="remove-ads-body">
        {!hasAccount && (
          <p className="remove-ads-note">
            Sign in first so ad-free status syncs on all your devices.
          </p>
        )}

        {paymentUrl ? (
          <button
            type="button"
            className="btn btn-primary btn-block remove-ads-pay-btn"
            onClick={() => openPaymentLink(paymentUrl)}
          >
            Pay {priceLabel} (opens checkout)
          </button>
        ) : (
          <p className="remove-ads-setup-hint">
            Payment link not configured yet. Add{' '}
            <code>VITE_PAYMENT_URL_INTL</code> or <code>VITE_PAYMENT_URL_BR</code>{' '}
            in Vercel — see <code>docs/MONETIZATION.md</code>.
          </p>
        )}

        {showPixQr && (
          <div className="remove-ads-pix">
            <p className="remove-ads-pix-label">
              Or pay with PIX in your bank app:
            </p>
            <img
              src="/pix-qr.png"
              alt="PIX QR code"
              className="pix-qr"
              width={200}
              height={200}
            />
          </div>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={onConfirmPaid}
        >
          I paid — remove ads on this account
        </button>

        <p className="remove-ads-fine">
          One-time tip to help with hosting. No subscription.
        </p>

        <button type="button" className="btn btn-ghost btn-block" onClick={onRemoveFree}>
          Remove ads without paying
        </button>
      </div>
    </div>
  );
}
