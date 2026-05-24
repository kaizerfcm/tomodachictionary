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
  extra?: string;
  generation: FullCharacterGeneration;
  existingCharacters: Character[];
  onConfirm: (result: {
    character: Character;
    incomingBySpeakerId: Record<string, string[]>;
  }) => void;
  onClose: () => void;
}

function initialPicks(options: [string, string, string]) {
  return options.map((opt) => Boolean(opt.trim()));
}

export function NewCharacterReviewModal({
  name,
  extra,
  generation,
  existingCharacters,
  onConfirm,
  onClose,
}: NewCharacterReviewModalProps) {
  const [phrasePicks, setPhrasePicks] = useState(() =>
    Object.fromEntries(
      PHRASE_TYPES.map(({ key }) => [
        key,
        initialPicks(generation.phrases[key]),
      ]),
    ) as Record<PhraseType, boolean[]>,
  );
  const [defaultPicks, setDefaultPicks] = useState(() =>
    initialPicks(generation.outgoing.nicknameDefault),
  );
  const [outgoingPicks, setOutgoingPicks] = useState<Record<string, boolean[]>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.outgoing.byTargetName).map((n) => [
          n,
          initialPicks(generation.outgoing.byTargetName[n]),
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
      const picks = outgoingPicks[targetName] ?? initialPicks(triplet);
      const selected = triplet.filter((_, i) => picks[i]);
      if (selected.length) nicknames[id] = selected;
    }

    const char: Character = {
      ...createCharacter(name, undefined, extra),
      phrases,
      nicknameDefaults,
      nicknames,
    };

    onConfirm({ character: char, incomingBySpeakerId: {} });
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
        Review the generated lines before adding. Use ✨ on the character later
        to generate more options. How other islanders call {name} is set on their
        profiles after adding.
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
              selectedIndices={outgoingPicks[targetName] ?? initialPicks(triplet)}
              onToggle={(i) =>
                setOutgoingPicks((p) => {
                  const cur = [...(p[targetName] ?? initialPicks(triplet))];
                  cur[i] = !cur[i];
                  return { ...p, [targetName]: cur };
                })
              }
            />
          ),
        )}
      </section>
    </Modal>
  );
}
