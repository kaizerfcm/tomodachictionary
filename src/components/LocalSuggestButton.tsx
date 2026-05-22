interface LocalSuggestButtonProps {
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

export function LocalSuggestButton({
  busy,
  disabled,
  title = 'Suggest locally (free)',
  onClick,
}: LocalSuggestButtonProps) {
  return (
    <button
      type="button"
      className="btn-suggest"
      disabled={disabled || busy}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {busy ? '…' : '🎲'}
    </button>
  );
}
