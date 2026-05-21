import { useState } from 'react';
import type { PaymentConfig } from '../lib/paymentConfig';
import { openPaymentLink, usesWebStripe } from '../lib/paymentConfig';
import { canRemoveAdsForFree, usesGooglePlayBilling } from '../lib/platform';
import {
  purchaseRemoveAdsOnPlay,
  restorePlayPurchases,
} from '../lib/googlePlay';

interface RemoveAdsPageProps {
  payment: PaymentConfig;
  hasAccount: boolean;
  onBack: () => void;
  onRemoveFree: () => void;
  onPaymentComplete?: () => void;
}

export function RemoveAdsPage({
  payment,
  hasAccount,
  onBack,
  onRemoveFree,
  onPaymentComplete,
}: RemoveAdsPageProps) {
  const { paymentUrl } = payment;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayPurchase = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await purchaseRemoveAdsOnPlay();
      if (ok) onPaymentComplete?.();
      else setError('Purchase was not completed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePlayRestore = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await restorePlayPurchases();
      if (ok) onPaymentComplete?.();
      else setError('No previous purchase found for this account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="config-page remove-ads-page">
      <header className="config-header">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Remove ads</h1>
      </header>

      <div className="remove-ads-body">
        {usesGooglePlayBilling() && (
          <>
            {!hasAccount && (
              <p className="remove-ads-note">
                Sign in so your Play Store purchase is linked to cloud save.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy}
              onClick={handlePlayPurchase}
            >
              {busy ? 'Please wait…' : 'Buy remove ads (Google Play)'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              disabled={busy}
              onClick={handlePlayRestore}
            >
              Restore purchase
            </button>
          </>
        )}

        {usesWebStripe() && (
          <>
            {!hasAccount && (
              <p className="remove-ads-note">
                Sign in with the <strong>same email</strong> you use at checkout so
                ads are removed automatically after payment.
              </p>
            )}
            {paymentUrl ? (
              <button
                type="button"
                className="btn btn-primary btn-block remove-ads-pay-btn"
                onClick={() => openPaymentLink(paymentUrl)}
              >
                Pay to remove ads (Stripe checkout)
              </button>
            ) : (
              <p className="remove-ads-setup-hint">
                Payment URL is not configured. Set <code>VITE_PAYMENT_URL_INTL</code>{' '}
                on Vercel.
              </p>
            )}
            <p className="remove-ads-fine">
              After a successful payment, return here — ads hide automatically when
              your account is matched (usually within a minute). Refresh if needed.
            </p>
          </>
        )}

        {error && <p className="auth-error">{error}</p>}

        {canRemoveAdsForFree() && (
          <button
            type="button"
            className="btn btn-ghost btn-block remove-ads-free-link"
            onClick={onRemoveFree}
          >
            Remove ads without paying
          </button>
        )}
      </div>
    </div>
  );
}
