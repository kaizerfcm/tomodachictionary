import type { ThemePreference } from '../lib/theme';

interface ConfigPageProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  accountEmail?: string;
  themePreference: ThemePreference;
  onThemePreferenceChange: (pref: ThemePreference) => void;
  onClearAllData: () => void;
  onBack: () => void;
}

export function ConfigPage({
  apiKey,
  onApiKeyChange,
  accountEmail,
  themePreference,
  onThemePreferenceChange,
  onClearAllData,
  onBack,
}: ConfigPageProps) {
  const handleClearAll = () => {
    if (
      window.confirm(
        'Clear all islanders and dialogue? This cannot be undone.',
      )
    ) {
      onClearAllData();
    }
  };

  return (
    <main className="config-page">
      <header className="config-header">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <h1>Configuration</h1>
      </header>

      {accountEmail && (
        <section className="config-section">
          <h2>Account</h2>
          <p className="config-desc">
            Signed in for cloud sync. Use this email at checkout if you pay to
            remove ads on the web.
          </p>
          <p className="config-account-email">{accountEmail}</p>
        </section>
      )}

      <section className="config-section">
        <h2>Appearance</h2>
        <p className="config-desc">
          Theme follows your device when set to System. Change anytime here.
        </p>
        <label className="config-label" htmlFor="theme-pref">
          Theme
        </label>
        <select
          id="theme-pref"
          className="config-input config-select"
          value={themePreference}
          onChange={(e) =>
            onThemePreferenceChange(e.target.value as ThemePreference)
          }
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </section>

      <section className="config-section">
        <h2>Gemini API</h2>
        <p className="config-desc">
          Used to generate dialogue and nicknames in character. Your key stays
          in this browser only (localStorage). Get a key from{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AI Studio
          </a>
          .
        </p>
        <label className="config-label" htmlFor="gemini-key">
          API key
        </label>
        <input
          id="gemini-key"
          type="password"
          className="config-input"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="AIza…"
          autoComplete="off"
        />
        <p className="config-hint">Model: Gemini 2.5 Flash</p>
        {apiKey.trim() ? (
          <p className="config-status config-status-ok">
            Generate buttons are enabled.
          </p>
        ) : (
          <p className="config-status">
            Add a key to enable AI generation when creating or editing
            characters.
          </p>
        )}
      </section>

      <section className="config-section config-section-danger">
        <h2>Data</h2>
        <p className="config-desc">
          Permanently remove every character and all dialogue from this device
          {accountEmail ? ' and cloud save' : ''}.
        </p>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleClearAll}
        >
          Clear all data
        </button>
      </section>
    </main>
  );
}
