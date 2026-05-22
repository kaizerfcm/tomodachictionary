import type { Character } from '../types';

export interface MissingNicknamePairs {
  missingOutgoing: Character[];
  missingIncoming: Character[];
}

export function hasAnyNickname(values: string[] | undefined): boolean {
  return (values ?? []).some((v) => v.trim().length > 0);
}

export function getMissingNicknamePairs(
  subject: Character,
  allCharacters: Character[],
): MissingNicknamePairs {
  const others = allCharacters.filter((c) => c.id !== subject.id);
  return {
    missingOutgoing: others.filter(
      (other) => !hasAnyNickname(subject.nicknames[other.id]),
    ),
    missingIncoming: others.filter(
      (other) => !hasAnyNickname(other.nicknames[subject.id]),
    ),
  };
}

export function countMissingNicknamePairs(missing: MissingNicknamePairs): number {
  return missing.missingOutgoing.length + missing.missingIncoming.length;
}
