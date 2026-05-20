import { useState } from 'react';

export type AuthMode = 'signIn' | 'signUp';

interface AuthScreenProps {
  mode: AuthMode;
  onBack: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  migrateHint?: boolean;
}

export function AuthScreen({
  mode,
  onBack,
  onSubmit,
  migrateHint,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(email.trim(), password);
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
        {migrateHint && isSignUp && (
          <p className="welcome-hint">
            Your current local island will be uploaded to this account.
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="config-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="config-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy}
          >
            {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
