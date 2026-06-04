import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** When false, clicking the backdrop does not close the modal. Default true. */
  dismissible?: boolean;
  /** Hide the header Close control (footer actions only). */
  hideHeaderClose?: boolean;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  dismissible = true,
  hideHeaderClose = false,
}: ModalProps) {
  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          {!hideHeaderClose && (
            <button
              type="button"
              className="modal-close"
              onClick={dismissible ? onClose : undefined}
              disabled={!dismissible}
              aria-label="Close"
            >
              Close
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
