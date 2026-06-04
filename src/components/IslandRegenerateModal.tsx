import { Modal } from './Modal';
import type { IslandRegenMode } from './IslandRegenerateOptionsModal';

export type IslandRegenFailure = {
  characterId: string;
  characterName: string;
  error: string;
};

export type IslandRegenProgress = {
  mode: IslandRegenMode;
  phase: 'running' | 'stopped' | 'done';
  /** 0-based index of the character currently being processed (sequential) or 0 for batch. */
  index: number;
  /** Sequential: islander count. Batch: always 1 (one API request). */
  total: number;
  /** Batch mode only — how many islanders are in the single request. */
  islanderCount?: number;
  currentName: string;
  succeeded: string[];
  failed: IslandRegenFailure[];
};

interface IslandRegenerateModalProps {
  progress: IslandRegenProgress;
  onStop: () => void;
  onRetryFailed: () => void;
  onHide: () => void;
}

export function IslandRegenerateModal({
  progress,
  onStop,
  onRetryFailed,
  onHide,
}: IslandRegenerateModalProps) {
  const { mode, phase, index, total, islanderCount, currentName, succeeded, failed } =
    progress;
  const running = phase === 'running';
  const processed = succeeded.length + failed.length;
  const batchRunning = mode === 'batch' && running;
  const pct =
    batchRunning
      ? 0
      : total > 0
        ? Math.round((processed / total) * 100)
        : 0;
  const hasFailures = failed.length > 0;

  let title = 'Regenerating island';
  if (phase === 'stopped') title = 'Island regeneration stopped';
  if (phase === 'done') {
    title = hasFailures
      ? 'Island regeneration finished with errors'
      : 'Island regeneration complete';
  }

  return (
    <Modal
      title={title}
      onClose={onHide}
      wide
      hideHeaderClose
      footer={
        <>
          {hasFailures && !running && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onRetryFailed}
            >
              Retry failed ({failed.length})
            </button>
          )}
          {running ? (
            <button type="button" className="btn btn-secondary" onClick={onStop}>
              Stop
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onHide}>
            Hide
          </button>
        </>
      }
    >
      {running && (
        <>
          <p className="modal-intro">
            {mode === 'batch' ? (
              <>
                Regenerating <strong>{islanderCount ?? total}</strong> islander
                {(islanderCount ?? total) === 1 ? '' : 's'} in{' '}
                <strong>one API request</strong>…
              </>
            ) : (
              <>
                {index + 1} / {total}: <strong>{currentName}</strong>
              </>
            )}
          </p>
          <div
            className={`island-regen-progress-bar${batchRunning ? ' island-regen-progress-indeterminate' : ''}`}
            role="progressbar"
            aria-valuenow={batchRunning ? undefined : pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-busy={batchRunning}
          >
            <div
              className={`island-regen-progress-fill${batchRunning ? ' island-regen-progress-fill-indeterminate' : ''}`}
              style={batchRunning ? undefined : { width: `${pct}%` }}
            />
          </div>
          <p className="island-regen-progress-meta">
            {mode === 'batch'
              ? batchRunning
                ? 'Waiting for Gemini (single batch response)…'
                : `Batch request complete · ${islanderCount ?? succeeded.length} islander${(islanderCount ?? succeeded.length) === 1 ? '' : 's'}`
              : `${processed} of ${total} processed`}
            {succeeded.length > 0 && ` · ${succeeded.length} ok`}
            {failed.length > 0 && ` · ${failed.length} failed`}
          </p>
        </>
      )}

      {phase !== 'running' && (
        <p className="modal-intro">
          {succeeded.length > 0 && (
            <>
              <strong>{succeeded.length}</strong> ok
            </>
          )}
          {hasFailures && (
            <>
              {succeeded.length > 0 ? ' · ' : ''}
              <strong>{failed.length}</strong> failed
              {phase === 'stopped' ? ' (stopped)' : ''}
            </>
          )}
          {!hasFailures && succeeded.length === 0 && 'Nothing regenerated.'}
        </p>
      )}

      {succeeded.length > 0 && (
        <section className="island-regen-result-section">
          <h3>Succeeded</h3>
          <ul className="island-regen-name-list">
            {succeeded.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}

      {hasFailures && (
        <section className="island-regen-result-section island-regen-failures">
          <h3>Failed</h3>
          <ul className="island-regen-failure-list">
            {failed.map((item) => (
              <li key={item.characterId}>
                <strong>{item.characterName}</strong>
                <span className="island-regen-failure-error">{item.error}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modal>
  );
}
