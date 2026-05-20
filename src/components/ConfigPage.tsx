interface ConfigPageProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onBack: () => void;
}

export function ConfigPage({ apiKey, onApiKeyChange, onBack }: ConfigPageProps) {
  return (
    <main className="config-page">
      <header className="config-header">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <h1>Configuration</h1>
      </header>
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
    </main>
  );
}
