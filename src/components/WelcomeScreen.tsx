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
          Data stays in this browser only. You can create an account later to
          sync across devices.
        </p>

        {syncAvailable ? (
          <>
            <div className="welcome-divider">
              <span>or sync across devices</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={onSignIn}
            >
              Sign in
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={onSignUp}
            >
              Create account
            </button>
            <p className="welcome-hint">
              Free cloud save via Supabase. Same island on phone and PC.
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
