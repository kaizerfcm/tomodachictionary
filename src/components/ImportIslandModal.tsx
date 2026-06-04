interface ImportIslandModalProps {
  characterCount: number;
  onReplace: () => void;
  onAddNew: () => void;
  onCancel: () => void;
}

export function ImportIslandModal({
  characterCount,
  onReplace,
  onAddNew,
  onCancel,
}: ImportIslandModalProps) {
  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal import-island-modal"
        role="dialog"
        aria-labelledby="import-island-title"
        aria-modal="true"
      >
        <h2 id="import-island-title">Import island JSON</h2>
        <p>
          Found {characterCount} character{characterCount === 1 ? '' : 's'}. How
          should this import be applied?
        </p>
        <div className="import-island-actions">
          <button type="button" className="btn btn-primary" onClick={onReplace}>
            Replace active island
          </button>
          <button type="button" className="btn btn-secondary" onClick={onAddNew}>
            Add as new island
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
