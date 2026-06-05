import {
  MAX_NICKNAME_OPTIONS,
  MAX_PHRASES_PER_TYPE,
} from '../constants';
import type { FullCharacterGeneration, Triplet } from './ai/types';
import { parseInteractionTopicFromAi } from './interactionTopics';
import { formatGiftsPreview } from './livingTheDreamGifts';
import { dedupeNicknames, sanitizeCharacterNicknames } from './nicknames';
import {
  PHRASE_TYPES,
  type Character,
  type InteractionTopic,
  type PhraseType,
  type LevelUpRewards,
} from '../types';

export type RegenerateChoice = 'current' | 'new';

export type RegenerateChoices = {
  phrases: Record<PhraseType, RegenerateChoice>;
  nicknameDefault: RegenerateChoice;
  outgoingByTargetId: Record<string, RegenerateChoice>;
  levelUpRewards: RegenerateChoice;
  interactionTopicsByTargetId: Record<string, RegenerateChoice>;
};

export function tripletToLines(triplet: Triplet): string[] {
  return triplet.map((line) => line.trim()).filter(Boolean);
}

export function phrasesFromGeneration(
  generation: FullCharacterGeneration['phrases'],
): Record<PhraseType, string[]> {
  const out = {} as Record<PhraseType, string[]>;
  for (const { key } of PHRASE_TYPES) {
    const type = key as PhraseType;
    out[type] = tripletToLines(generation[type] ?? ['', '', '']).slice(
      0,
      MAX_PHRASES_PER_TYPE,
    );
  }
  return out;
}

export function nicknamesFromOutgoing(
  outgoing: FullCharacterGeneration['outgoing'],
  characters: Character[],
): {
  nicknameDefaults: string[];
  nicknames: Record<string, string[]>;
} {
  const nameToId = new Map(characters.map((c) => [c.name, c.id]));
  const nicknames: Record<string, string[]> = {};
  for (const [targetName, triplet] of Object.entries(outgoing.byTargetName)) {
    const targetId = nameToId.get(targetName);
    if (!targetId) continue;
    nicknames[targetId] = dedupeNicknames(tripletToLines(triplet));
  }
  return sanitizeCharacterNicknames({
    nicknameDefaults: tripletToLines(outgoing.nicknameDefault),
    nicknames,
  });
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

  const interactionTopicsByTargetId: Record<string, RegenerateChoice> = {};
  for (const target of allCharacters) {
    if (target.id === character.id) continue;
    const hasCurrent = Boolean(
      character.interactionTopics?.[target.id]?.text?.trim(),
    );
    const hasNew = Boolean(generation.interactionTopics?.[target.name]);
    if (hasCurrent || hasNew) {
      interactionTopicsByTargetId[target.id] = 'current';
    }
  }

  return {
    phrases,
    nicknameDefault: 'current',
    outgoingByTargetId,
    levelUpRewards: 'current',
    interactionTopicsByTargetId,
  };
}

export function allNewRegenerateChoices(
  character: Character,
  allCharacters: Character[],
  generation: FullCharacterGeneration,
): RegenerateChoices {
  const base = defaultRegenerateChoices(character, allCharacters, generation);

  const phrases = Object.fromEntries(
    PHRASE_TYPES.map(({ key }) => [key, 'new' as RegenerateChoice]),
  ) as Record<PhraseType, RegenerateChoice>;

  const outgoingByTargetId: Record<string, RegenerateChoice> = {};
  for (const [targetId] of Object.entries(base.outgoingByTargetId)) {
    outgoingByTargetId[targetId] = 'new';
  }

  const interactionTopicsByTargetId: Record<string, RegenerateChoice> = {};
  for (const [targetId] of Object.entries(base.interactionTopicsByTargetId)) {
    interactionTopicsByTargetId[targetId] = 'new';
  }

  return {
    phrases,
    nicknameDefault: 'new',
    outgoingByTargetId,
    levelUpRewards: 'new',
    interactionTopicsByTargetId,
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
  levelUpRewards: LevelUpRewards;
  interactionTopics: Record<string, InteractionTopic>;
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

  let levelUpRewards: LevelUpRewards = {
    song: character.levelUpRewards?.song ?? '',
    interior: character.levelUpRewards?.interior ?? '',
    clothing: character.levelUpRewards?.clothing ?? '',
    hat: character.levelUpRewards?.hat ?? '',
    goods: character.levelUpRewards?.goods ?? '',
    quirks: character.levelUpRewards?.quirks ?? '',
  };
  if (choices.levelUpRewards === 'new' && generation.levelUpRewards) {
    levelUpRewards = {
      ...levelUpRewards,
      goods: generation.levelUpRewards.goods || '',
      quirks: generation.levelUpRewards.quirks || '',
    };
  }

  const interactionTopics = { ...(character.interactionTopics ?? {}) };
  for (const [targetName, topicVal] of Object.entries(
    generation.interactionTopics || {},
  )) {
    const targetId = nameToId.get(targetName);
    if (!targetId) continue;
    if (choices.interactionTopicsByTargetId?.[targetId] !== 'new') continue;
    const parsed = parseInteractionTopicFromAi(topicVal);
    if (parsed) interactionTopics[targetId] = parsed;
  }

  return { phrases, nicknameDefaults, nicknames, levelUpRewards, interactionTopics };
}

export function formatGiftsCompare(gifts: LevelUpRewards | undefined): string {
  if (!gifts) return '(empty)';
  return formatGiftsPreview(gifts);
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

export function topicCompareTargets(
  character: Character,
  allCharacters: Character[],
  generation: FullCharacterGeneration,
): Character[] {
  return allCharacters.filter((target) => {
    if (target.id === character.id) return false;
    const hasCurrent = Boolean(
      character.interactionTopics?.[target.id]?.text?.trim(),
    );
    const hasNew = Boolean(generation.interactionTopics?.[target.name]);
    return hasCurrent || hasNew;
  });
}

