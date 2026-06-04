import { MAX_PHRASES_PER_TYPE, MAX_PHRASE_LENGTH, MAX_SHORT_TEXT_LENGTH } from '../constants';
import { isShortPhraseType } from '../lib/textLimits';
import { PHRASE_TYPES, type PhraseType } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { CommunityPhrasesButton } from './CommunityPhrasesButton';
import { EditorSectionHeader } from './EditorSectionHeader';

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
    <div className="phrase-section">
      <div className="phrase-section-head">
        <span className="phrase-section-label">{label}</span>
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
                    : `Canon AI — one ${label.toLowerCase()} line from source`
                }
                onClick={onGenerateAi}
              />
            )}
          </span>
        )}
      </div>
      <div className="phrase-list">
        {phrases.map((phrase, index) => (
          <div key={index} className="phrase-row">
            <span className="option-index">{index + 1}</span>
            <input
              type="text"
              className="phrase-input"
              value={phrase}
              maxLength={shortPhrase ? MAX_SHORT_TEXT_LENGTH : MAX_PHRASE_LENGTH}
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
    </div>
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
  onRegenerateAllPhrases,
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
  onRegenerateAllPhrases?: () => void;
}) {
  return (
    <section className="phrases-panel editor-section">
      <EditorSectionHeader title="Phrases">
        {hasApiKey && onRegenerateAllPhrases && (
          <AiSparkButton
            onClick={onRegenerateAllPhrases}
            busy={generatingKey === 'phrases:all'}
            disabled={generatingKey === 'phrases:all'}
            title="Canon AI — regenerate all phrase types from source"
          />
        )}
      </EditorSectionHeader>
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
