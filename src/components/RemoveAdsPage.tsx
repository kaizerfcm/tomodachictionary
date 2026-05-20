interface RemoveAdsPageProps {
  isBrazil: boolean;
  hasAccount: boolean;
  onBack: () => void;
  onConfirmPaid: () => void;
  onRemoveFree: () => void;
}

export function RemoveAdsPage({
  isBrazil,
  hasAccount,
  onBack,
  onConfirmPaid,
  onRemoveFree,
}: RemoveAdsPageProps) {
  const priceLabel = isBrazil ? 'R$ 10' : '$5 USD';

  return (
    <div className="config-page remove-ads-page">
      <header className="config-header">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Remove ads</h1>
      </header>

      <div className="remove-ads-body">
        <p>
          This app is a small fan project. Ads help cover hosting and development
          time. If you use an ad blocker anyway, consider a one-time tip as a
          gesture of good faith — it is optional and honor-based (no payment
          processor is wired up).
        </p>

        {!hasAccount && (
          <p className="remove-ads-note">
            Sign in or create an account so ad-free status syncs across devices.
            You can still remove ads locally from this browser using the link
            below.
          </p>
        )}

        <section className="remove-ads-paid">
          <h2>Support the project ({priceLabel})</h2>
          {isBrazil ? (
            <>
              <p>
                PIX (one-time, no subscription). Scan the QR code in your bank
                app, then confirm below when sent.
              </p>
              <img
                src="/pix-qr.png"
                alt="PIX QR code for Itaú payment"
                className="pix-qr"
                width={220}
                height={220}
              />
            </>
          ) : (
            <p>
              Send about <strong>{priceLabel}</strong> using whatever method you
              prefer (PayPal, Ko-fi, etc.) if you would like to support the
              project. Then tap the button below.
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={onConfirmPaid}>
            I have sent {priceLabel} — remove ads on this account
          </button>
        </section>

        <section className="remove-ads-free">
          <h2>Prefer not to pay?</h2>
          <p>
            If you read the above and would rather never pay, you can still
            remove ads. No hard feelings — enjoy the editor.
          </p>
          <button type="button" className="btn btn-ghost" onClick={onRemoveFree}>
            Remove ads without paying
          </button>
        </section>
      </div>
    </div>
  );
}
