import { MAX_PHRASES_PER_TYPE } from '../constants';
import { PHRASE_TYPES, type PhraseType } from '../types';
import { AiSparkButton } from './AiSparkButton';

interface PhraseSectionProps {
  label: string;
  phrases: string[];
  onUpdate: (index: number, text: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  hasApiKey?: boolean;
  aiBusy?: boolean;
  onGenerateAi?: () => void;
}

export function PhraseSection({
  label,
  phrases,
  onUpdate,
  onAdd,
  onRemove,
  hasApiKey,
  aiBusy,
  onGenerateAi,
}: PhraseSectionProps) {
  const atLimit = phrases.length >= MAX_PHRASES_PER_TYPE;

  return (
    <details className="phrase-section" open={phrases.length > 0}>
      <summary className="phrase-section-summary">
        <span>{label}</span>
        {hasApiKey && onGenerateAi && (
          <span className="phrase-section-actions">
            <AiSparkButton
              busy={aiBusy}
              disabled={atLimit}
              title={
                atLimit
                  ? 'Phrase limit reached'
                  : `Generate one ${label.toLowerCase()} line`
              }
              onClick={onGenerateAi}
            />
          </span>
        )}
      </summary>
      <div className="phrase-list">
        {phrases.map((phrase, index) => (
          <div key={index} className="phrase-row">
            <span className="option-index">{index + 1}</span>
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
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onAdd}
          disabled={atLimit}
        >
          + Add
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
  hasApiKey,
  generatingKey,
  onGeneratePhrase,
}: {
  phrases: Record<PhraseType, string[]>;
  onUpdatePhrase: (type: PhraseType, index: number, text: string) => void;
  onAddPhrase: (type: PhraseType) => void;
  onRemovePhrase: (type: PhraseType, index: number) => void;
  hasApiKey?: boolean;
  generatingKey?: string | null;
  onGeneratePhrase?: (type: PhraseType) => void;
}) {
  return (
    <section className="phrases-panel">
      {PHRASE_TYPES.map(({ key, label }) => (
        <PhraseSection
          key={key}
          label={label}
          phrases={phrases[key]}
          onUpdate={(index, text) => onUpdatePhrase(key, index, text)}
          onAdd={() => onAddPhrase(key)}
          onRemove={(index) => onRemovePhrase(key, index)}
          hasApiKey={hasApiKey}
          aiBusy={generatingKey === `phrase:${key}`}
          onGenerateAi={
            onGeneratePhrase ? () => onGeneratePhrase(key) : undefined
          }
        />
      ))}
    </section>
  );
}
