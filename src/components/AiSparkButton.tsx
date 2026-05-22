interface AiSparkButtonProps {
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

export function AiSparkButton({
  busy,
  disabled,
  title = 'Canon AI (Gemini)',
  onClick,
}: AiSparkButtonProps) {
  return (
    <button
      type="button"
      className="btn-ai"
      disabled={disabled || busy}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {busy ? '…' : '✨'}
    </button>
  );
}
