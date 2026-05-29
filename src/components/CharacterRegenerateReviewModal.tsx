import { useMemo, useState } from 'react';
import { PHRASE_TYPES, type Character } from '../types';
import type { FullCharacterGeneration } from '../lib/gemini/types';
import {
  buildRegeneratedCharacterContent,
  defaultRegenerateChoices,
  formatDialoguePreview,
  outgoingCompareTargets,
  tripletToLines,
  type RegenerateChoice,
  type RegenerateChoices,
} from '../lib/characterRegeneration';
import { OptionCompare } from './OptionTriplet';
import { Modal } from './Modal';

interface CharacterRegenerateReviewModalProps {
  character: Character;
  generation: FullCharacterGeneration;
  allCharacters: Character[];
  regenerating?: boolean;
  onRegenerate: () => void;
  onConfirm: (patch: {
    phrases: Character['phrases'];
    nicknameDefaults: string[];
    nicknames: Record<string, string[]>;
  }) => void;
  onClose: () => void;
}

export function CharacterRegenerateReviewModal({
  character,
  generation,
  allCharacters,
  regenerating = false,
  onRegenerate,
  onConfirm,
  onClose,
}: CharacterRegenerateReviewModalProps) {
  const [choices, setChoices] = useState<RegenerateChoices>(() =>
    defaultRegenerateChoices(character, allCharacters, generation),
  );

  const outgoingTargets = useMemo(
    () => outgoingCompareTargets(character, allCharacters, generation),
    [allCharacters, character, generation],
  );

  const handleConfirm = () => {
    const patch = buildRegeneratedCharacterContent(
      character,
      generation,
      allCharacters,
      choices,
    );
    onConfirm(patch);
  };

  const setPhraseChoice = (key: (typeof PHRASE_TYPES)[number]['key'], value: RegenerateChoice) => {
    setChoices((prev) => ({
      ...prev,
      phrases: { ...prev.phrases, [key]: value },
    }));
  };

  const setOutgoingChoice = (targetId: string, value: RegenerateChoice) => {
    setChoices((prev) => ({
      ...prev,
      outgoingByTargetId: { ...prev.outgoingByTargetId, [targetId]: value },
    }));
  };

  return (
    <Modal
      title={`Regenerate: ${character.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={regenerating}
            onClick={onRegenerate}
          >
            {regenerating ? 'Regenerating…' : '✨ Regenerate again'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={regenerating}
            onClick={handleConfirm}
          >
            Apply selected
          </button>
        </>
      }
    >
      <p className="modal-intro">
        Choose current or new for each section. Only categories you set to New
        will change on save — everything else stays as it is.
      </p>
      <section className="review-section">
        <h3>Dialogue phrases</h3>
        {PHRASE_TYPES.map(({ key, label }) => (
          <OptionCompare
            key={key}
            label={label}
            name={`phrase-${key}`}
            currentText={formatDialoguePreview(character.phrases[key])}
            newText={formatDialoguePreview(tripletToLines(generation.phrases[key]))}
            choice={choices.phrases[key]}
            onChoice={(value) => setPhraseChoice(key, value)}
          />
        ))}
      </section>
      <section className="review-section">
        <h3>Calls others</h3>
        <OptionCompare
          label="Defaults (new islanders)"
          name="nick-default"
          currentText={formatDialoguePreview(character.nicknameDefaults)}
          newText={formatDialoguePreview(
            tripletToLines(generation.outgoing.nicknameDefault),
          )}
          choice={choices.nicknameDefault}
          onChoice={(value) =>
            setChoices((prev) => ({ ...prev, nicknameDefault: value }))
          }
        />
        {outgoingTargets.map((target) => (
          <OptionCompare
            key={target.id}
            label={target.name}
            name={`outgoing-${target.id}`}
            currentText={formatDialoguePreview(
              character.nicknames[target.id] ?? [],
            )}
            newText={formatDialoguePreview(
              tripletToLines(
                generation.outgoing.byTargetName[target.name] ?? ['', '', ''],
              ),
            )}
            choice={choices.outgoingByTargetId[target.id] ?? 'current'}
            onChoice={(value) => setOutgoingChoice(target.id, value)}
          />
        ))}
      </section>
    </Modal>
  );
}
