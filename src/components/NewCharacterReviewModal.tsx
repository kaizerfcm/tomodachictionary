import { useMemo, useState } from 'react';
import { PHRASE_TYPES, emptyPhrases, type Character, type PhraseType } from '../types';
import type { FullCharacterGeneration } from '../lib/gemini/types';
import { OptionTriplet, OptionTripletMulti } from './OptionTriplet';
import { Modal } from './Modal';

interface NewCharacterReviewModalProps {
  name: string;
  generation: FullCharacterGeneration;
  existingCharacters: Character[];
  onConfirm: (result: {
    character: Character;
    incomingBySpeakerId: Record<string, string>;
  }) => void;
  onClose: () => void;
}

export function NewCharacterReviewModal({
  name,
  generation,
  existingCharacters,
  onConfirm,
  onClose,
}: NewCharacterReviewModalProps) {
  const [phrasePicks, setPhrasePicks] = useState(() =>
    Object.fromEntries(
      PHRASE_TYPES.map(({ key }) => [key, [true, true, true] as boolean[]]),
    ) as Record<PhraseType, boolean[]>,
  );
  const [defaultPick, setDefaultPick] = useState(0);
  const [outgoingPicks, setOutgoingPicks] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.outgoing.byTargetName).map((n) => [n, 0]),
      ),
  );
  const [incomingPicks, setIncomingPicks] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.incoming.bySpeakerName).map((n) => [n, 0]),
      ),
  );

  const nameToId = useMemo(
    () => new Map(existingCharacters.map((c) => [c.name, c.id])),
    [existingCharacters],
  );

  const handleConfirm = () => {
    const phrases = emptyPhrases();
    for (const { key } of PHRASE_TYPES) {
      const triplet = generation.phrases[key];
      const picks = phrasePicks[key];
      phrases[key] = triplet.filter((_, i) => picks[i]);
    }

    const nicknameDefault =
      generation.outgoing.nicknameDefault[defaultPick] ?? '';
    const nicknames: Record<string, string> = {};
    for (const [targetName, triplet] of Object.entries(
      generation.outgoing.byTargetName,
    )) {
      const id = nameToId.get(targetName);
      if (!id) continue;
      const idx = outgoingPicks[targetName] ?? 0;
      nicknames[id] = triplet[idx] ?? '';
    }

    const char: Character = {
      id: crypto.randomUUID(),
      name,
      phrases,
      nicknameDefault,
      nicknames,
    };

    const incomingBySpeakerId: Record<string, string> = {};
    for (const [speakerName, triplet] of Object.entries(
      generation.incoming.bySpeakerName,
    )) {
      const id = nameToId.get(speakerName);
      if (!id) continue;
      const idx = incomingPicks[speakerName] ?? 0;
      incomingBySpeakerId[id] = triplet[idx] ?? '';
    }

    onConfirm({ character: char, incomingBySpeakerId });
  };

  return (
    <Modal
      title={`Review: ${name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Add to island
          </button>
        </>
      }
    >
      <p className="modal-intro">
        Pick options to apply. All three phrase lines are selected by default
        per type.
      </p>
      <section className="review-section">
        <h3>Dialogue phrases</h3>
        {PHRASE_TYPES.map(({ key, label }) => (
          <OptionTripletMulti
            key={key}
            label={label}
            options={generation.phrases[key]}
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
      </section>
      <section className="review-section">
        <h3>Calls others</h3>
        <OptionTriplet
          label="Default (new islanders)"
          name="out-default"
          options={generation.outgoing.nicknameDefault}
          selectedIndex={defaultPick}
          onSelect={setDefaultPick}
        />
        {Object.entries(generation.outgoing.byTargetName).map(
          ([targetName, triplet]) => (
            <OptionTriplet
              key={targetName}
              label={targetName}
              name={`out-${targetName}`}
              options={triplet}
              selectedIndex={outgoingPicks[targetName] ?? 0}
              onSelect={(i) =>
                setOutgoingPicks((p) => ({ ...p, [targetName]: i }))
              }
            />
          ),
        )}
      </section>
      <section className="review-section">
        <h3>How others call {name}</h3>
        {Object.entries(generation.incoming.bySpeakerName).map(
          ([speakerName, triplet]) => (
            <OptionTriplet
              key={speakerName}
              label={speakerName}
              name={`in-${speakerName}`}
              options={triplet}
              selectedIndex={incomingPicks[speakerName] ?? 0}
              onSelect={(i) =>
                setIncomingPicks((p) => ({ ...p, [speakerName]: i }))
              }
            />
          ),
        )}
      </section>
    </Modal>
  );
}
