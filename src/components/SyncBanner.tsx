interface SyncBannerProps {
  syncError?: string | null;
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  /** Show local-only sign-in prompt (not signed in, supabase configured). */
  showLocalPrompt?: boolean;
}

/** Fixed overlay — does not shift page layout. No “saving” indicator. */
export function SyncBanner({
  syncError,
  onCreateAccount,
  onSignIn,
  showLocalPrompt,
}: SyncBannerProps) {
  if (syncError) {
    return (
      <div className="sync-toast sync-toast-error" role="alert">
        {syncError}
      </div>
    );
  }

  if (!showLocalPrompt || !onCreateAccount || !onSignIn) return null;

  return (
    <div className="sync-toast sync-toast-local">
      <span>Local only — not synced</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={onCreateAccount}>
        Create account
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onSignIn}>
        Sign in
      </button>
    </div>
  );
}
