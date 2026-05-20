interface AiGenerateBarProps {
  generating: boolean;
  error: string | null;
  onGeneratePhrases: () => void;
  onRegenerateNicknames: () => void;
}

export function AiGenerateBar({
  generating,
  error,
  onGeneratePhrases,
  onRegenerateNicknames,
}: AiGenerateBarProps) {
  return (
    <section className="ai-bar">
      <h2 className="ai-bar-title">Generate with Gemini</h2>
      <div className="ai-bar-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={generating}
          onClick={onGeneratePhrases}
        >
          {generating ? 'Generating…' : 'More phrases (3 per type)'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={generating}
          onClick={onRegenerateNicknames}
        >
          {generating ? 'Generating…' : 'Regenerate nicknames'}
        </button>
      </div>
      {error && <p className="ai-bar-error">{error}</p>}
    </section>
  );
}
