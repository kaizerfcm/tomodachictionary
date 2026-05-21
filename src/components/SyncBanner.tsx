import type { SyncStatus } from '../hooks/useDictionary';

interface SyncBannerProps {
  mode: 'local' | 'cloud';
  syncStatus?: SyncStatus;
  syncError?: string | null;
  onCreateAccount: () => void;
  onSignIn: () => void;
  syncAvailable: boolean;
}

export function SyncBanner({
  mode,
  syncStatus,
  syncError,
  onCreateAccount,
  onSignIn,
  syncAvailable,
}: SyncBannerProps) {
  if (mode === 'cloud') {
    const showStatus =
      syncStatus === 'saving' ||
      syncStatus === 'error' ||
      Boolean(syncError);

    if (!showStatus) return null;

    let statusText = 'Sync error';
    if (syncStatus === 'saving') statusText = 'Saving to cloud…';
    else if (syncStatus === 'error') statusText = 'Could not save';

    return (
      <div className="sync-banner sync-banner-cloud">
        <span className={`sync-banner-text sync-status-${syncStatus}`}>
          {statusText}
        </span>
        {syncError && <p className="sync-banner-error">{syncError}</p>}
      </div>
    );
  }

  if (!syncAvailable) return null;

  return (
    <div className="sync-banner sync-banner-local">
      <span className="sync-banner-text">Local only — not synced</span>
      <div className="sync-banner-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onCreateAccount}
        >
          Create account
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSignIn}>
          Sign in
        </button>
      </div>
    </div>
  );
}
