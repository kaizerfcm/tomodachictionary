import {
  MAX_NICKNAME_OPTIONS,
  MAX_PHRASES_PER_TYPE,
} from '../constants';
import type { FullCharacterGeneration, Triplet } from './gemini/types';
import { PHRASE_TYPES, type Character, type PhraseType } from '../types';

export type RegenerateChoice = 'current' | 'new';

export type RegenerateChoices = {
  phrases: Record<PhraseType, RegenerateChoice>;
  nicknameDefault: RegenerateChoice;
  outgoingByTargetId: Record<string, RegenerateChoice>;
};

export function tripletToLines(triplet: Triplet): string[] {
  return triplet.map((line) => line.trim()).filter(Boolean);
}

export function formatDialoguePreview(lines: string[]): string {
  const list = lines.map((line) => line.trim()).filter(Boolean);
  return list.length ? list.join(' · ') : '(empty)';
}

export function defaultRegenerateChoices(
  character: Character,
  allCharacters: Character[],
  generation: FullCharacterGeneration,
): RegenerateChoices {
  const phrases = Object.fromEntries(
    PHRASE_TYPES.map(({ key }) => [key, 'current' as RegenerateChoice]),
  ) as Record<PhraseType, RegenerateChoice>;

  const outgoingByTargetId: Record<string, RegenerateChoice> = {};
  for (const target of allCharacters) {
    if (target.id === character.id) continue;
    const hasCurrent = Boolean(character.nicknames[target.id]?.length);
    const hasNew = Boolean(generation.outgoing.byTargetName[target.name]);
    if (hasCurrent || hasNew) {
      outgoingByTargetId[target.id] = 'current';
    }
  }

  return {
    phrases,
    nicknameDefault: 'current',
    outgoingByTargetId,
  };
}

export function buildRegeneratedCharacterContent(
  character: Character,
  generation: FullCharacterGeneration,
  allCharacters: Character[],
  choices: RegenerateChoices,
): {
  phrases: Record<PhraseType, string[]>;
  nicknameDefaults: string[];
  nicknames: Record<string, string[]>;
} {
  const phrases = { ...character.phrases };
  for (const { key } of PHRASE_TYPES) {
    if (choices.phrases[key] === 'new') {
      phrases[key] = tripletToLines(generation.phrases[key]).slice(
        0,
        MAX_PHRASES_PER_TYPE,
      );
    }
  }

  let nicknameDefaults = [...character.nicknameDefaults];
  if (choices.nicknameDefault === 'new') {
    nicknameDefaults = tripletToLines(generation.outgoing.nicknameDefault).slice(
      0,
      MAX_NICKNAME_OPTIONS,
    );
  }

  const nicknames = { ...character.nicknames };
  const nameToId = new Map(allCharacters.map((c) => [c.name, c.id]));
  for (const [targetName, triplet] of Object.entries(
    generation.outgoing.byTargetName,
  )) {
    const targetId = nameToId.get(targetName);
    if (!targetId) continue;
    if (choices.outgoingByTargetId[targetId] !== 'new') continue;
    const lines = tripletToLines(triplet);
    if (lines.length) {
      nicknames[targetId] = lines.slice(0, MAX_NICKNAME_OPTIONS);
    }
  }

  return { phrases, nicknameDefaults, nicknames };
}

export function outgoingCompareTargets(
  character: Character,
  allCharacters: Character[],
  generation: FullCharacterGeneration,
): Character[] {
  return allCharacters.filter((target) => {
    if (target.id === character.id) return false;
    const hasCurrent = Boolean(character.nicknames[target.id]?.length);
    const hasNew = Boolean(generation.outgoing.byTargetName[target.name]);
    return hasCurrent || hasNew;
  });
}
