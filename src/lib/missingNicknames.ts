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

export function chunkCharacters(
  characters: Character[],
  chunkSize: number,
): Character[][] {
  if (characters.length === 0) return [];
  const size = Math.max(1, chunkSize);
  const chunks: Character[][] = [];
  for (let i = 0; i < characters.length; i += size) {
    chunks.push(characters.slice(i, i + size));
  }
  return chunks;
}

/** Split missing pairs into API-sized chunks (outgoing and incoming lists chunked separately). */
export function chunkMissingNicknamePairs(
  missing: MissingNicknamePairs,
  chunkSize: number,
): MissingNicknamePairs[] {
  const outgoingChunks = chunkCharacters(missing.missingOutgoing, chunkSize);
  const incomingChunks = chunkCharacters(missing.missingIncoming, chunkSize);
  if (outgoingChunks.length === 0 && incomingChunks.length === 0) {
    return [];
  }
  const n = Math.max(outgoingChunks.length, incomingChunks.length);
  const result: MissingNicknamePairs[] = [];
  for (let i = 0; i < n; i += 1) {
    result.push({
      missingOutgoing: outgoingChunks[i] ?? [],
      missingIncoming: incomingChunks[i] ?? [],
    });
  }
  return result;
}
