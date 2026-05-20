import type { Character } from '../types';

export interface NicknameSeedEntry {
  default_address: string;
  specific_nicknames: Record<string, string>;
}

export type NicknameSeed = Record<string, NicknameSeedEntry>;

/** Resolved label this speaker uses for a target (specific → default → target name). */
export function getEffectiveNickname(
  speaker: Character,
  target: Character,
): string {
  const specific = speaker.nicknames[target.id];
  if (specific !== undefined && specific !== '') return specific;
  if (speaker.nicknameDefault) return speaker.nicknameDefault;
  return target.name;
}

/** Value shown in the per-target input (empty when using default or legal name). */
export function getNicknameInputValue(
  speaker: Character,
  target: Character,
): string {
  return speaker.nicknames[target.id] ?? '';
}

export function getNicknamePlaceholder(
  speaker: Character,
  target: Character,
): string {
  if (speaker.nicknameDefault) return speaker.nicknameDefault;
  return target.name;
}

export function applyNicknameSeed(
  characters: Character[],
  seed: NicknameSeed,
): Character[] {
  const nameToId = new Map(characters.map((c) => [c.name, c.id]));

  return characters.map((char) => {
    const entry = seed[char.name];
    if (!entry) {
      return { ...char, nicknameDefault: char.nicknameDefault ?? '' };
    }

    const nicknames: Record<string, string> = {};
    for (const [targetName, nick] of Object.entries(entry.specific_nicknames)) {
      const targetId = nameToId.get(targetName);
      if (targetId && targetId !== char.id) {
        nicknames[targetId] = nick;
      }
    }

    return {
      ...char,
      nicknameDefault: entry.default_address,
      nicknames,
    };
  });
}
