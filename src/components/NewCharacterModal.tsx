import { useState } from 'react';
import { MAX_CHARACTER_EXTRA_LENGTH } from '../constants';
import { Modal } from './Modal';

interface NewCharacterModalProps {
  hasApiKey: boolean;
  onClose: () => void;
  onAddPlain: (name: string, extra?: string) => void;
  onQuickFill: (name: string, extra?: string) => void;
  onCanonAi: (name: string, extra?: string) => void;
}

export function NewCharacterModal({
  hasApiKey,
  onClose,
  onAddPlain,
  onQuickFill,
  onCanonAi,
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

  const handleQuickFill = () => {
    if (!canSubmit) return;
    onQuickFill(trimmed, trimmedExtra || undefined);
  };

  const handleCanonAi = () => {
    if (!canSubmit) return;
    onCanonAi(trimmed, trimmedExtra || undefined);
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
            onClick={handleQuickFill}
          >
            Quick fill
          </button>
          {hasApiKey && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!canSubmit}
              onClick={handleCanonAi}
            >
              Canon AI
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
            handleQuickFill();
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
      <p className="modal-intro">
        <strong>Quick fill</strong> adds generic starter lines (free).{' '}
        {hasApiKey ? (
          <>
            <strong>Canon AI</strong> quotes and paraphrases lines from their
            source — put series/role in Extra (e.g. &quot;VA-11 Hall-A
            bartender&quot;).
          </>
        ) : (
          <>Add a Gemini key in Configuration for canon-accurate dialogue.</>
        )}
      </p>
    </Modal>
  );
}
