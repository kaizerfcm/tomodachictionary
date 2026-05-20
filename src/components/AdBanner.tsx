interface AdBannerProps {
  onRemoveAds: () => void;
}

export function AdBanner({ onRemoveAds }: AdBannerProps) {
  return (
    <aside className="ad-banner" aria-label="Sponsored">
      <div className="ad-banner-placeholder">
        <span className="ad-banner-label">Ad</span>
        <span className="ad-banner-text">Support the app — or remove this space</span>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRemoveAds}>
        Remove ads
      </button>
    </aside>
  );
}
