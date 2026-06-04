import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import {
  clearAiLogs,
  downloadAiLogsJson,
  listAiLogs,
  type AiLogEntry,
} from '../lib/ai/aiLogStore';

interface AiLogsModalProps {
  onClose: () => void;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LogDetail({ entry }: { entry: AiLogEntry }) {
  return (
    <div className="ai-log-detail">
      <section>
        <h4>Prompt</h4>
        <pre className="ai-log-pre">{entry.prompt}</pre>
      </section>
      <section>
        <h4>Request</h4>
        <pre className="ai-log-pre">
          {JSON.stringify(entry.request, null, 2)}
        </pre>
      </section>
      {entry.response && (
        <section>
          <h4>Response</h4>
          <pre className="ai-log-pre">{entry.response.text}</pre>
          {entry.response.finishReason && (
            <p className="ai-log-meta">
              finishReason: {entry.response.finishReason}
            </p>
          )}
        </section>
      )}
      {entry.error && (
        <section className="ai-log-error-section">
          <h4>Error</h4>
          <p className="ai-log-error">{entry.error}</p>
        </section>
      )}
    </div>
  );
}

export function AiLogsModal({ onClose }: AiLogsModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const logs = useMemo(() => {
    void refreshKey;
    return listAiLogs();
  }, [refreshKey]);

  const handleClear = () => {
    if (!window.confirm('Clear all AI logs? This cannot be undone.')) return;
    clearAiLogs();
    setExpandedId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <Modal
      title="AI logs"
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadAiLogsJson()}
            disabled={logs.length === 0}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={logs.length === 0}
          >
            Clear all
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p className="modal-intro">
        One log entry per Gemini request — prompt, request body, and response or
        error. Stored locally in this browser only.
      </p>
      {logs.length === 0 ? (
        <p className="empty-hint">No AI requests logged yet.</p>
      ) : (
        <ul className="ai-log-list">
          {logs.map((entry) => {
            const open = expandedId === entry.id;
            return (
              <li key={entry.id} className="ai-log-item">
                <button
                  type="button"
                  className="ai-log-summary"
                  onClick={() => setExpandedId(open ? null : entry.id)}
                  aria-expanded={open}
                >
                  <span
                    className={`ai-log-status ai-log-status-${entry.status}`}
                  >
                    {entry.status}
                  </span>
                  <span className="ai-log-operation">{entry.operation}</span>
                  <span className="ai-log-when">{formatWhen(entry.timestamp)}</span>
                  <span className="ai-log-duration">
                    {formatDuration(entry.durationMs)}
                  </span>
                </button>
                {open && <LogDetail entry={entry} />}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
