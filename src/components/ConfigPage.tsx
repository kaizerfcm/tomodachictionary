import type { AiProviderId } from '../lib/ai/types';
import { providerLabel } from '../lib/ai/callModel';
import type { ThemePreference } from '../lib/theme';

interface ConfigPageProps {
  provider: AiProviderId;
  onProviderChange: (provider: AiProviderId) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  signedIn: boolean;
  accountEmail?: string;
  themePreference: ThemePreference;
  onThemePreferenceChange: (pref: ThemePreference) => void;
  onClearAllData: () => void;
  onBack: () => void;
}

const PROVIDERS: AiProviderId[] = [
  'gemini',
  'groq',
  'openrouter',
  'hosted',
];

function keyPlaceholder(provider: AiProviderId): string {
  switch (provider) {
    case 'groq':
      return 'gsk_…';
    case 'openrouter':
      return 'sk-or-…';
    default:
      return 'AIza…';
  }
}

function keyHelpUrl(provider: AiProviderId): string {
  switch (provider) {
    case 'groq':
      return 'https://console.groq.com/keys';
    case 'openrouter':
      return 'https://openrouter.ai/keys';
    default:
      return 'https://aistudio.google.com/apikey';
  }
}

export function ConfigPage({
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  signedIn,
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

  const showKeyField = provider !== 'hosted';

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
        <h2>Generation</h2>
        <p className="config-desc">
          🎲 <strong>Suggest</strong> uses free on-device templates. ✨{' '}
          <strong>Canon AI</strong> uses the provider below. 👥 Community
          suggestions need sign-in (no API key).
        </p>
        <label className="config-label" htmlFor="ai-provider">
          Canon AI provider
        </label>
        <select
          id="ai-provider"
          className="config-input config-select"
          value={provider}
          onChange={(e) =>
            onProviderChange(e.target.value as AiProviderId)
          }
        >
          {PROVIDERS.map((id) => (
            <option key={id} value={id}>
              {providerLabel(id)}
            </option>
          ))}
        </select>
        {provider === 'hosted' && (
          <p className="config-hint">
            {signedIn
              ? 'Uses Tomodict cloud quota (40 requests/day per account). No API key needed.'
              : 'Sign in to use Tomodict cloud generation.'}
          </p>
        )}
        {showKeyField && (
          <>
            <label className="config-label" htmlFor="ai-key">
              {providerLabel(provider)} API key
            </label>
            <input
              id="ai-key"
              type="password"
              className="config-input"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={keyPlaceholder(provider)}
              autoComplete="off"
            />
            <p className="config-hint">
              Stored in this browser only. Get a key from{' '}
              <a
                href={keyHelpUrl(provider)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {providerLabel(provider)}
              </a>
              .
            </p>
          </>
        )}
        {(showKeyField && apiKey.trim()) || (provider === 'hosted' && signedIn) ? (
          <p className="config-status config-status-ok">
            Canon AI (✨) is enabled.
          </p>
        ) : (
          <p className="config-status">
            Canon AI needs a key or Tomodict cloud (when signed in). Quick fill
            and 🎲 suggest work without a key.
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
