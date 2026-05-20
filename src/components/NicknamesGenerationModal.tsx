import { useMemo, useState } from 'react';
import type { Character } from '../types';
import type { NicknameRegeneration } from '../lib/gemini/types';
import { OptionTriplet } from './OptionTriplet';
import { Modal } from './Modal';

interface NicknamesGenerationModalProps {
  character: Character;
  generation: NicknameRegeneration;
  allCharacters: Character[];
  onConfirm: (result: {
    nicknameDefault: string;
    outgoing: Record<string, string>;
    incomingBySpeakerId: Record<string, string>;
  }) => void;
  onClose: () => void;
}

export function NicknamesGenerationModal({
  character,
  generation,
  allCharacters,
  onConfirm,
  onClose,
}: NicknamesGenerationModalProps) {
  const [defaultPick, setDefaultPick] = useState(0);
  const [outgoingPicks, setOutgoingPicks] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.byTargetName).map((n) => [n, 0]),
      ),
  );
  const [incomingPicks, setIncomingPicks] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        Object.keys(generation.incoming.bySpeakerName).map((n) => [n, 0]),
      ),
  );

  const nameToId = useMemo(
    () => new Map(allCharacters.map((c) => [c.name, c.id])),
    [allCharacters],
  );

  const handleConfirm = () => {
    const nicknameDefault =
      generation.nicknameDefault[defaultPick] ?? '';
    const outgoing: Record<string, string> = {};
    for (const [targetName, triplet] of Object.entries(
      generation.byTargetName,
    )) {
      const id = nameToId.get(targetName);
      if (!id) continue;
      outgoing[id] = triplet[outgoingPicks[targetName] ?? 0] ?? '';
    }

    const incomingBySpeakerId: Record<string, string> = {};
    for (const [speakerName, triplet] of Object.entries(
      generation.incoming.bySpeakerName,
    )) {
      const id = nameToId.get(speakerName);
      if (!id) continue;
      incomingBySpeakerId[id] = triplet[incomingPicks[speakerName] ?? 0] ?? '';
    }

    onConfirm({ nicknameDefault, outgoing, incomingBySpeakerId });
  };

  return (
    <Modal
      title={`Nicknames: ${character.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Apply selected
          </button>
        </>
      }
    >
      <p className="modal-intro">
        Suggested nicknames based on current ones. Pick one option per row.
      </p>
      <section className="review-section">
        <h3>Calls others</h3>
        <OptionTriplet
          label="Default (new islanders)"
          name="regen-default"
          options={generation.nicknameDefault}
          selectedIndex={defaultPick}
          onSelect={setDefaultPick}
        />
        {Object.entries(generation.byTargetName).map(([targetName, triplet]) => (
          <OptionTriplet
            key={targetName}
            label={targetName}
            name={`regen-out-${targetName}`}
            options={triplet}
            selectedIndex={outgoingPicks[targetName] ?? 0}
            onSelect={(i) =>
              setOutgoingPicks((p) => ({ ...p, [targetName]: i }))
            }
          />
        ))}
      </section>
      <section className="review-section">
        <h3>How others call {character.name}</h3>
        {Object.entries(generation.incoming.bySpeakerName).map(
          ([speakerName, triplet]) => (
            <OptionTriplet
              key={speakerName}
              label={speakerName}
              name={`regen-in-${speakerName}`}
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
