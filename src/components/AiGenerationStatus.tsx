import { useEffect } from 'react';

export type AiNotice = {
  kind: 'success' | 'error';
  message: string;
};

interface AiGenerationStatusProps {
  busy: boolean;
  notice: AiNotice | null;
  onDismissNotice: () => void;
}

const NOTICE_MS = { success: 4000, error: 8000 };

export function AiGenerationStatus({
  busy,
  notice,
  onDismissNotice,
}: AiGenerationStatusProps) {
  useEffect(() => {
    if (!notice) return;
    const ms = NOTICE_MS[notice.kind];
    const t = window.setTimeout(onDismissNotice, ms);
    return () => window.clearTimeout(t);
  }, [notice, onDismissNotice]);

  if (!busy && !notice) return null;

  return (
    <div className="ai-gen-status" aria-live="polite">
      {notice && (
        <div
          className={`ai-gen-toast ai-gen-toast-${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm ai-gen-toast-dismiss"
            onClick={onDismissNotice}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {busy && (
        <div className="ai-gen-spinner-wrap" aria-busy="true" aria-label="Generating with Gemini">
          <span className="ai-gen-spinner" aria-hidden />
          <span className="ai-gen-spinner-label">Generating…</span>
        </div>
      )}
    </div>
  );
}
