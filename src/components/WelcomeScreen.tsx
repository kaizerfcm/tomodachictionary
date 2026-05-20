interface WelcomeScreenProps {
  syncAvailable: boolean;
  onContinueLocal: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function WelcomeScreen({
  syncAvailable,
  onContinueLocal,
  onSignIn,
  onSignUp,
}: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>Tomodachi Dictionary</h1>
        <p className="welcome-lead">
          Manage islander dialogue for Tomodachi Life: Living the Dream.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onContinueLocal}
        >
          Continue locally
        </button>
        <p className="welcome-hint">
          Data stays in this browser only. Create a free account anytime to sync
          across devices (username + password, no email).
        </p>

        {syncAvailable ? (
          <>
            <div className="welcome-divider">
              <span>or sync across devices</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={onSignUp}
            >
              Create account
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={onSignIn}
            >
              Sign in
            </button>
            <p className="welcome-hint">
              Cloud save via Supabase. Use your current island or start fresh when
              you sign up.
            </p>
          </>
        ) : (
          <p className="welcome-hint welcome-hint-muted">
            Cloud sync is not configured on this deployment. Use local mode, or
            add Supabase keys (see README).
          </p>
        )}
      </div>
    </div>
  );
}
