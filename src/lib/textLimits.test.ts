import { describe, expect, it } from 'vitest';
import {
  clampOutgoingNickname,
  clampPhraseForType,
  clampShortText,
  clampStandardPhrase,
} from './textLimits';

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
});
