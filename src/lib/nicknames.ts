import { MAX_NICKNAME_OPTIONS } from '../constants';
import type { Character } from '../types';
import { migrateCharacter } from '../types';

export interface NicknameSeedEntry {
  default_address: string;
  specific_nicknames: Record<string, string>;
}

export type NicknameSeed = Record<string, NicknameSeedEntry>;

export function getTargetNicknames(
  speaker: Character,
  targetId: string,
): string[] {
  return speaker.nicknames[targetId] ?? [];
}

export function getAllNicknamesForSearch(
  speaker: Character,
  target: Character,
): string[] {
  const specific = getTargetNicknames(speaker, target.id);
  const defaults = speaker.nicknameDefaults;
  return [...specific, ...defaults, target.name];
}

export function getEffectiveNickname(
  speaker: Character,
  target: Character,
): string {
  const list = getTargetNicknames(speaker, target.id);
  if (list.length) return list[0];
  if (speaker.nicknameDefaults.length) return speaker.nicknameDefaults[0];
  return target.name;
}

export function canAddNicknameOption(currentCount: number): boolean {
  return currentCount < MAX_NICKNAME_OPTIONS;
}

export function dedupeNicknames(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, MAX_NICKNAME_OPTIONS);
}

export function applyNicknameSeed(
  characters: Character[],
  seed: NicknameSeed,
): Character[] {
  const nameToId = new Map(characters.map((c) => [c.name, c.id]));

  return characters.map((char) => {
    const base = migrateCharacter(char);
    const entry = seed[char.name];
    if (!entry) return base;

    const nicknames: Record<string, string[]> = { ...base.nicknames };
    for (const [targetName, nick] of Object.entries(entry.specific_nicknames)) {
      const targetId = nameToId.get(targetName);
      if (targetId && targetId !== char.id && nick.trim()) {
        nicknames[targetId] = dedupeNicknames([
          ...(nicknames[targetId] ?? []),
          nick.trim(),
        ]);
      }
    }

    return {
      ...base,
      nicknameDefaults: entry.default_address.trim()
        ? dedupeNicknames([
            ...base.nicknameDefaults,
            entry.default_address.trim(),
          ])
        : base.nicknameDefaults,
      nicknames,
    };
  });
}
