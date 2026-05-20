import { useState } from 'react';
import { PHRASE_TYPES, type PhraseType } from '../types';
import type { GeneratedPhrases } from '../lib/gemini/types';
import { OptionTripletMulti } from './OptionTriplet';
import { Modal } from './Modal';

interface PhrasesGenerationModalProps {
  characterName: string;
  generation: GeneratedPhrases;
  onConfirm: (toAppend: Partial<Record<PhraseType, string[]>>) => void;
  onClose: () => void;
}

export function PhrasesGenerationModal({
  characterName,
  generation,
  onConfirm,
  onClose,
}: PhrasesGenerationModalProps) {
  const [phrasePicks, setPhrasePicks] = useState(() =>
    Object.fromEntries(
      PHRASE_TYPES.map(({ key }) => [key, [true, true, true] as boolean[]]),
    ) as Record<PhraseType, boolean[]>,
  );

  const handleConfirm = () => {
    const toAppend: Partial<Record<PhraseType, string[]>> = {};
    for (const { key } of PHRASE_TYPES) {
      const lines = generation[key].filter((_, i) => phrasePicks[key][i]);
      if (lines.length) toAppend[key] = lines;
    }
    onConfirm(toAppend);
  };

  return (
    <Modal
      title={`New phrases: ${characterName}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Add selected
          </button>
        </>
      }
    >
      <p className="modal-intro">
        Three new lines per type. Check the ones you want to append.
      </p>
      {PHRASE_TYPES.map(({ key, label }) => (
        <OptionTripletMulti
          key={key}
          label={label}
          options={generation[key]}
          selectedIndices={phrasePicks[key]}
          onToggle={(i) =>
            setPhrasePicks((prev) => {
              const next = [...prev[key]];
              next[i] = !next[i];
              return { ...prev, [key]: next };
            })
          }
        />
      ))}
    </Modal>
  );
}
