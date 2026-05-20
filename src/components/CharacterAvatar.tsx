import { getInitials, type Character } from '../types';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'grid';

interface CharacterAvatarProps {
  character: Pick<Character, 'name' | 'avatar'>;
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function CharacterAvatar({
  character,
  size = 'md',
  className = '',
  onClick,
  title,
}: CharacterAvatarProps) {
  const cls = `avatar avatar-${size}${className ? ` ${className}` : ''}`;
  const content = character.avatar ? (
    <img
      src={character.avatar}
      alt=""
      className={cls}
      width={48}
      height={48}
      decoding="async"
    />
  ) : (
    <span className={cls} aria-hidden="true">
      {getInitials(character.name)}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="avatar-button"
        onClick={onClick}
        title={title ?? `Open ${character.name}`}
        aria-label={title ?? `Open ${character.name}`}
      >
        {content}
      </button>
    );
  }

  return content;
}
