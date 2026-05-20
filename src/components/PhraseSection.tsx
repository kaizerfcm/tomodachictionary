import { PHRASE_TYPES, type PhraseType } from '../types';

interface PhraseSectionProps {
  label: string;
  phrases: string[];
  onUpdate: (index: number, text: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function PhraseSection({
  label,
  phrases,
  onUpdate,
  onAdd,
  onRemove,
}: PhraseSectionProps) {
  return (
    <details className="phrase-section" open={phrases.length > 0}>
      <summary className="phrase-section-summary">
        <span>{label}</span>
        <span className="phrase-count">{phrases.length}</span>
      </summary>
      <div className="phrase-list">
        {phrases.length === 0 ? (
          <p className="empty-hint">No phrases yet.</p>
        ) : (
          phrases.map((phrase, index) => (
            <div key={index} className="phrase-row">
              <input
                type="text"
                className="phrase-input"
                value={phrase}
                onChange={(e) => onUpdate(index, e.target.value)}
                aria-label={`${label} phrase ${index + 1}`}
              />
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onRemove(index)}
                aria-label="Remove phrase"
              >
                Remove
              </button>
            </div>
          ))
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
          + Add phrase
        </button>
      </div>
    </details>
  );
}

export function PhraseEditor({
  phrases,
  onUpdatePhrase,
  onAddPhrase,
  onRemovePhrase,
}: {
  phrases: Record<PhraseType, string[]>;
  onUpdatePhrase: (type: PhraseType, index: number, text: string) => void;
  onAddPhrase: (type: PhraseType) => void;
  onRemovePhrase: (type: PhraseType, index: number) => void;
}) {
  return (
    <section className="phrases-panel">
      <h2 className="panel-title">Dialogue phrases</h2>
      {PHRASE_TYPES.map(({ key, label }) => (
        <PhraseSection
          key={key}
          label={label}
          phrases={phrases[key]}
          onUpdate={(index, text) => onUpdatePhrase(key, index, text)}
          onAdd={() => onAddPhrase(key)}
          onRemove={(index) => onRemovePhrase(key, index)}
        />
      ))}
    </section>
  );
}
