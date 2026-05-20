import { useMemo, useState } from 'react';
import {
  PHRASE_TYPES,
  createCharacter,
  emptyPhrases,
  type Character,
  type PhraseType,
} from '../types';
import type { FullCharacterGeneration } from '../lib/gemini/types';
import { OptionTripletMulti } from './OptionTriplet';
import { Modal } from './Modal';

interface NewCharacterReviewModalProps {
  name: string;
  generation: FullCharacterGeneration;
  existingCharacters: Character[];
  onConfirm: (result: {
    character: Character;
    incomingBySpeakerId: Record<string, string[]>;
  }) => void;
  onClose: () => void;
}

function tripletPicks() {
  return [true, true, true] as boolean[];
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
      PHRASE_TYPES.map(({ key }) => [key, tripletPicks()]),
    ) as Record<PhraseType, boolean[]>,
  );
  const [defaultPicks, setDefaultPicks] = useState(tripletPicks);
  const [outgoingPicks, setOutgoingPicks] = useState<Record<string, boolean[]>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.outgoing.byTargetName).map((n) => [
          n,
          tripletPicks(),
        ]),
      ),
  );
  const [incomingPicks, setIncomingPicks] = useState<Record<string, boolean[]>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.incoming.bySpeakerName).map((n) => [
          n,
          tripletPicks(),
        ]),
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

    const nicknameDefaults = generation.outgoing.nicknameDefault.filter(
      (_, i) => defaultPicks[i],
    );
    const nicknames: Record<string, string[]> = {};
    for (const [targetName, triplet] of Object.entries(
      generation.outgoing.byTargetName,
    )) {
      const id = nameToId.get(targetName);
      if (!id) continue;
      const picks = outgoingPicks[targetName] ?? tripletPicks();
      const selected = triplet.filter((_, i) => picks[i]);
      if (selected.length) nicknames[id] = selected;
    }

    const char: Character = {
      ...createCharacter(name),
      phrases,
      nicknameDefaults,
      nicknames,
    };

    const incomingBySpeakerId: Record<string, string[]> = {};
    for (const [speakerName, triplet] of Object.entries(
      generation.incoming.bySpeakerName,
    )) {
      const id = nameToId.get(speakerName);
      if (!id) continue;
      const picks = incomingPicks[speakerName] ?? tripletPicks();
      const selected = triplet.filter((_, i) => picks[i]);
      if (selected.length) incomingBySpeakerId[id] = selected;
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
        Check the lines to add. You can keep all three per row or pick only the
        ones you like — multiple nicknames per person are supported.
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
        <OptionTripletMulti
          label="Defaults (new islanders)"
          options={generation.outgoing.nicknameDefault}
          selectedIndices={defaultPicks}
          onToggle={(i) =>
            setDefaultPicks((prev) => {
              const next = [...prev];
              next[i] = !next[i];
              return next;
            })
          }
        />
        {Object.entries(generation.outgoing.byTargetName).map(
          ([targetName, triplet]) => (
            <OptionTripletMulti
              key={targetName}
              label={targetName}
              options={triplet}
              selectedIndices={outgoingPicks[targetName] ?? tripletPicks()}
              onToggle={(i) =>
                setOutgoingPicks((p) => {
                  const cur = [...(p[targetName] ?? tripletPicks())];
                  cur[i] = !cur[i];
                  return { ...p, [targetName]: cur };
                })
              }
            />
          ),
        )}
      </section>
      <section className="review-section">
        <h3>How others call {name}</h3>
        {Object.entries(generation.incoming.bySpeakerName).map(
          ([speakerName, triplet]) => (
            <OptionTripletMulti
              key={speakerName}
              label={speakerName}
              options={triplet}
              selectedIndices={incomingPicks[speakerName] ?? tripletPicks()}
              onToggle={(i) =>
                setIncomingPicks((p) => {
                  const cur = [...(p[speakerName] ?? tripletPicks())];
                  cur[i] = !cur[i];
                  return { ...p, [speakerName]: cur };
                })
              }
            />
          ),
        )}
      </section>
    </Modal>
  );
}
