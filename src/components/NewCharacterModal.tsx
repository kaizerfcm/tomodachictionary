import { useState } from 'react';
import { MAX_CHARACTER_EXTRA_LENGTH } from '../constants';
import { Modal } from './Modal';

interface NewCharacterModalProps {
  hasApiKey: boolean;
  onClose: () => void;
  onAddPlain: (name: string, extra?: string) => void;
  onAddWithGeneration: (name: string, extra?: string) => void;
}

export function NewCharacterModal({
  hasApiKey,
  onClose,
  onAddPlain,
  onAddWithGeneration,
}: NewCharacterModalProps) {
  const [name, setName] = useState('');
  const [extra, setExtra] = useState('');

  const trimmed = name.trim();
  const trimmedExtra = extra.trim();
  const canSubmit = trimmed.length > 0;

  const handlePlain = () => {
    if (!canSubmit) return;
    onAddPlain(trimmed, trimmedExtra || undefined);
    onClose();
  };

  const handleGenerate = () => {
    if (!canSubmit) return;
    onAddWithGeneration(trimmed, trimmedExtra || undefined);
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
                className="btn btn-secondary"
                disabled={!canSubmit}
                onClick={handleGenerate}
              >
                Generate with Gemini
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
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
          if (e.key === 'Enter' && canSubmit && !hasApiKey) {
            handlePlain();
          }
        }}
      />
      <label className="config-label" htmlFor="new-char-extra">
        Extra
      </label>
      <textarea
        id="new-char-extra"
        className="config-input config-textarea"
        value={extra}
        maxLength={MAX_CHARACTER_EXTRA_LENGTH}
        rows={2}
        placeholder="Source, series, tone…"
        onChange={(e) => setExtra(e.target.value)}
      />
      {!hasApiKey && (
        <p className="modal-intro">
          Add a Gemini API key in Configuration to auto-generate dialogue.
        </p>
      )}
    </Modal>
  );
}
