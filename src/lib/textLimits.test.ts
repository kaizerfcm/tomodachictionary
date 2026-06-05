import { describe, expect, it } from 'vitest';
import {
  clampOutgoingNickname,
  clampPhraseForType,
  clampShortText,
  clampStandardPhrase,
  applyShortTextLimitsToGeneration,
} from './textLimits';
import type { FullCharacterGeneration } from './ai/types';

describe('textLimits', () => {
  it('clamps short text to 13 characters', () => {
    expect(clampShortText('hello world!!!')).toBe('hello world!!');
    expect(clampOutgoingNickname('abcdefghijklmnop')).toBe('abcdefghijklm');
  });

  it('clamps starting and ending sentence types to 13 chars', () => {
    expect(clampPhraseForType('startingSentence', 'too long for game')).toBe(
      'too long for ',
    );
    expect(clampPhraseForType('endingSentence', 'too long for game')).toBe(
      'too long for ',
    );
  });

  it('clamps standard phrase types to 25 characters', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz';
    expect(clampPhraseForType('greeting', long)).toBe('abcdefghijklmnopqrstuvwxy');
    expect(clampStandardPhrase(long)).toBe('abcdefghijklmnopqrstuvwxy');
  });

  it('preserves levelUpRewards and interactionTopics in generation limits', () => {
    const generation = {
      phrases: {
        catchphrases: ['Hello', '', ''],
        startingSentence: ['So,', '', ''],
        endingSentence: ['...', '', ''],
        beforeEating: ['Yum', '', ''],
        shoutAtSea: ['HELP', '', ''],
        whenHappy: ['Yay', '', ''],
        whenSad: ['Sigh', '', ''],
        whenAngry: ['Grr', '', ''],
        whileSleeping: ['Zzz', '', ''],
        greeting: ['Hi', '', ''],
      },
      outgoing: {
        nicknameDefault: ['pal', '', ''],
        byTargetName: { Alex: ['buddy', '', ''] },
      },
      incoming: { bySpeakerName: {} },
      levelUpRewards: {
        song: 'Rock',
        interior: 'Lab',
        clothing: 'Jacket',
        hat: 'Cap',
        goods: 'Kite',
        quirks: 'Sleepyhead',
      },
      interactionTopics: {
        'Target Name': { text: 'retro games', kind: 'activity' },
      },
    } as FullCharacterGeneration;

    const limited = applyShortTextLimitsToGeneration(generation);
    expect(limited.levelUpRewards).toEqual(generation.levelUpRewards);
    expect(limited.interactionTopics).toEqual(generation.interactionTopics);
  });
});
