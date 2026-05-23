import { MAX_PHRASE_LENGTH, MAX_SHORT_TEXT_LENGTH } from '../constants';
import type { PhraseType } from '../types';
import type { FullCharacterGeneration, Triplet } from './gemini/types';

const SHORT_PHRASE_TYPES: PhraseType[] = [
  'startingSentence',
  'endingSentence',
];

export function isShortPhraseType(type: PhraseType): boolean {
  return SHORT_PHRASE_TYPES.includes(type);
}

export function clampShortText(text: string): string {
  return text.slice(0, MAX_SHORT_TEXT_LENGTH);
}

export function clampStandardPhrase(text: string): string {
  return text.slice(0, MAX_PHRASE_LENGTH);
}

export function clampPhraseForType(type: PhraseType, text: string): string {
  return isShortPhraseType(type)
    ? clampShortText(text)
    : clampStandardPhrase(text);
}

/** Default nicknames and per-target names in “calls others”. */
export function clampOutgoingNickname(text: string): string {
  return clampShortText(text);
}

export function applyShortTextLimitsToGeneration(
  generation: FullCharacterGeneration,
): FullCharacterGeneration {
  const phrases = {} as FullCharacterGeneration['phrases'];
  for (const type of Object.keys(generation.phrases) as PhraseType[]) {
    phrases[type] = generation.phrases[type].map((line) =>
      clampPhraseForType(type, line),
    ) as Triplet;
  }

  return {
    phrases,
    outgoing: {
      nicknameDefault: generation.outgoing.nicknameDefault.map(
        clampOutgoingNickname,
      ) as Triplet,
      byTargetName: Object.fromEntries(
        Object.entries(generation.outgoing.byTargetName).map(([name, triplet]) => [
          name,
          triplet.map(clampOutgoingNickname) as Triplet,
        ]),
      ),
    },
    incoming: generation.incoming,
  };
}
