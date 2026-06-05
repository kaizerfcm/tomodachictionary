import type { ThemePreference } from '../lib/theme';

interface ConfigPageProps {
  llmHost: string;
  onLlmHostChange: (host: string) => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (pref: ThemePreference) => void;
  onClearAllData: () => void;
  onBack: () => void;
}

export function ConfigPage({
  llmHost,
  onLlmHostChange,
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

      <section className="config-section">
        <h2>Appearance</h2>
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
        <h2>Local LLM</h2>
        <label className="config-label" htmlFor="llm-host">
          IP
        </label>
        <input
          id="llm-host"
          type="text"
          className="config-input"
          value={llmHost}
          onChange={(e) => onLlmHostChange(e.target.value)}
          autoComplete="off"
          placeholder="127.0.0.1"
        />
      </section>

      <section className="config-section config-danger">
        <h2>Data</h2>
        <button type="button" className="btn btn-danger" onClick={handleClearAll}>
          Clear all data
        </button>
      </section>
    </main>
  );
}
