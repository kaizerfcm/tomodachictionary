import { useState } from 'react';
import { Modal } from './Modal';

export type IslandRegenMode = 'sequential' | 'batch';

interface IslandRegenerateOptionsModalProps {
  characterCount: number;
  onStart: (mode: IslandRegenMode) => void;
  onCancel: () => void;
}

export function IslandRegenerateOptionsModal({
  characterCount,
  onStart,
  onCancel,
}: IslandRegenerateOptionsModalProps) {
  const [mode, setMode] = useState<IslandRegenMode>('sequential');

  return (
    <Modal
      title="Regenerate island"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onStart(mode)}
          >
            Start regeneration
          </button>
        </>
      }
    >
      <p className="modal-intro">
        Regenerate all {characterCount} islander{characterCount === 1 ? '' : 's'}.
      </p>

      <fieldset className="island-regen-mode-fieldset">
        <legend className="option-triplet-label">Generation mode</legend>
        <label className="option-choice">
          <input
            type="radio"
            name="island-regen-mode"
            checked={mode === 'sequential'}
            onChange={() => setMode('sequential')}
          />
          <span>
            <strong>One at a time</strong> — per islander; stop/retry individually.
          </span>
        </label>
        <label className="option-choice">
          <input
            type="radio"
            name="island-regen-mode"
            checked={mode === 'batch'}
            onChange={() => setMode('batch')}
          />
          <span>
            <strong>All at once</strong> — single JSON request for the whole island.
          </span>
        </label>
      </fieldset>
    </Modal>
  );
}
