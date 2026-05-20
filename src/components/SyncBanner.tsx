import type { SyncStatus } from '../hooks/useDictionary';

interface SyncBannerProps {
  mode: 'local' | 'cloud';
  displayName?: string;
  syncStatus?: SyncStatus;
  syncError?: string | null;
  onCreateAccount: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  syncAvailable: boolean;
}

export function SyncBanner({
  mode,
  displayName,
  syncStatus,
  syncError,
  onCreateAccount,
  onSignIn,
  onSignOut,
  syncAvailable,
}: SyncBannerProps) {
  if (mode === 'cloud' && displayName) {
    let statusText = '';
    if (syncStatus === 'saving') statusText = 'Saving…';
    else if (syncStatus === 'saved') statusText = 'Saved';
    else if (syncStatus === 'error') statusText = 'Sync error';

    return (
      <div className="sync-banner sync-banner-cloud">
        <span className="sync-banner-text">
          @{displayName}
          {statusText && (
            <span className={`sync-status sync-status-${syncStatus}`}>
              · {statusText}
            </span>
          )}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut}>
          Sign out
        </button>
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
