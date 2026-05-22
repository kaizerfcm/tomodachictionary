import { MAX_PHRASES_PER_TYPE, MAX_SHORT_TEXT_LENGTH } from '../constants';
import { isShortPhraseType } from '../lib/textLimits';
import { PHRASE_TYPES, type PhraseType } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { CommunityPhrasesButton } from './CommunityPhrasesButton';

interface PhraseSectionProps {
  label: string;
  phraseType: PhraseType;
  characterName: string;
  communityEnabled?: boolean;
  phrases: string[];
  onUpdate: (index: number, text: string) => void;
  onAdd: () => void;
  onAddText?: (text: string) => void;
  onRemove: (index: number) => void;
  hasApiKey?: boolean;
  aiBusy?: boolean;
  onGenerateAi?: () => void;
}

export function PhraseSection({
  label,
  phraseType,
  characterName,
  communityEnabled,
  phrases,
  onUpdate,
  onAdd,
  onAddText,
  onRemove,
  hasApiKey,
  aiBusy,
  onGenerateAi,
}: PhraseSectionProps) {
  const atLimit = phrases.length >= MAX_PHRASES_PER_TYPE;
  const showActions = communityEnabled || (hasApiKey && onGenerateAi);
  const shortPhrase = isShortPhraseType(phraseType);

  return (
    <details className="phrase-section" open={phrases.length > 0}>
      <summary className="phrase-section-summary">
        <span>{label}</span>
        {showActions && (
          <span className="phrase-section-actions">
            {communityEnabled && onAddText && (
              <CommunityPhrasesButton
                characterName={characterName}
                phraseType={phraseType}
                phraseLabel={label}
                existingPhrases={phrases}
                disabled={atLimit}
                onAddPhrase={onAddText}
              />
            )}
            {hasApiKey && onGenerateAi && (
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
            )}
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
              maxLength={shortPhrase ? MAX_SHORT_TEXT_LENGTH : undefined}
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
  characterName,
  communityEnabled,
  phrases,
  onUpdatePhrase,
  onAddPhrase,
  onRemovePhrase,
  hasApiKey,
  generatingKey,
  onGeneratePhrase,
}: {
  characterName: string;
  communityEnabled?: boolean;
  phrases: Record<PhraseType, string[]>;
  onUpdatePhrase: (type: PhraseType, index: number, text: string) => void;
  onAddPhrase: (type: PhraseType, text?: string) => void;
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
          phraseType={key}
          characterName={characterName}
          communityEnabled={communityEnabled}
          phrases={phrases[key]}
          onUpdate={(index, text) => onUpdatePhrase(key, index, text)}
          onAdd={() => onAddPhrase(key)}
          onAddText={(text) => onAddPhrase(key, text)}
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
