import { useState } from 'react';
import { Modal } from './Modal';

interface NewCharacterModalProps {
  hasApiKey: boolean;
  onClose: () => void;
  onAddPlain: (name: string) => void;
  onAddWithGeneration: (name: string) => void;
}

export function NewCharacterModal({
  hasApiKey,
  onClose,
  onAddPlain,
  onAddWithGeneration,
}: NewCharacterModalProps) {
  const [name, setName] = useState('');

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  const handlePlain = () => {
    if (!canSubmit) return;
    onAddPlain(trimmed);
    onClose();
  };

  const handleGenerate = () => {
    if (!canSubmit) return;
    onAddWithGeneration(trimmed);
  };

  return (
    <Modal
      title="Add character"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {hasApiKey ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!canSubmit}
                onClick={handlePlain}
              >
                Add empty
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={handleGenerate}
              >
                Generate with Gemini
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={handlePlain}
            >
              Add character
            </button>
          )}
        </>
      }
    >
      <label className="config-label" htmlFor="new-char-name">
        Character name
      </label>
      <input
        id="new-char-name"
        type="text"
        className="config-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Saber (Fate)"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSubmit) {
            hasApiKey ? handleGenerate() : handlePlain();
          }
        }}
      />
      {hasApiKey ? (
        <p className="modal-intro">
          Gemini will create 3 options per phrase and nickname, then let you
          review before adding.
        </p>
      ) : (
        <p className="modal-intro">
          Add a Gemini API key in Configuration to auto-generate dialogue.
        </p>
      )}
    </Modal>
  );
}
