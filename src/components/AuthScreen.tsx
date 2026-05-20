import { useState } from 'react';
import { validateUsername } from '../lib/authUsername';

export type AuthMode = 'signIn' | 'signUp';
export type SignUpIslandChoice = 'local' | 'fresh';

interface AuthScreenProps {
  mode: AuthMode;
  onBack: () => void;
  onSubmit: (
    mode: AuthMode,
    username: string,
    password: string,
    islandChoice?: SignUpIslandChoice,
  ) => Promise<void>;
  hasLocalData?: boolean;
}

export function AuthScreen({
  mode: initialMode,
  onBack,
  onSubmit,
  hasLocalData = false,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [islandChoice, setIslandChoice] = useState<SignUpIslandChoice>(
    hasLocalData ? 'local' : 'fresh',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = username.trim().toLowerCase();
    const validation = validateUsername(slug);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        mode,
        slug,
        password,
        isSignUp ? islandChoice : undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <button type="button" className="btn btn-ghost btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>{isSignUp ? 'Create account' : 'Sign in'}</h1>
        <p className="welcome-hint">
          Username and password only — no email. Pick a unique username (3–24
          characters, letters, numbers, underscore).
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="config-label" htmlFor="auth-username">
            Username
          </label>
          <input
            id="auth-username"
            type="text"
            className="config-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            pattern="[a-zA-Z0-9_]{3,24}"
          />
          <label className="config-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className="config-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          {isSignUp && (
            <fieldset className="auth-island-choice">
              <legend className="config-label">Start your cloud island with</legend>
              <label className="option-choice">
                <input
                  type="radio"
                  name="island-choice"
                  checked={islandChoice === 'local'}
                  onChange={() => setIslandChoice('local')}
                  disabled={!hasLocalData}
                />
                <span>
                  This device&apos;s current island
                  {!hasLocalData && ' (none saved here)'}
                </span>
              </label>
              <label className="option-choice">
                <input
                  type="radio"
                  name="island-choice"
                  checked={islandChoice === 'fresh'}
                  onChange={() => setIslandChoice('fresh')}
                />
                <span>Empty island (fresh start)</span>
              </label>
            </fieldset>
          )}

          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy}
          >
            {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode('signIn');
                  setError(null);
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode('signUp');
                  setError(null);
                }}
              >
                Create account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
