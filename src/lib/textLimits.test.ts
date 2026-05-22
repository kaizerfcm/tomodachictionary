import { describe, expect, it } from 'vitest';
import {
  clampOutgoingNickname,
  clampPhraseForType,
  clampShortText,
} from './textLimits';

describe('textLimits', () => {
  it('clamps short text to 13 characters', () => {
    expect(clampShortText('hello world!!!')).toBe('hello world!!');
    expect(clampOutgoingNickname('abcdefghijklmnop')).toBe('abcdefghijklm');
  });

  it('only clamps starting and ending sentence types', () => {
    expect(clampPhraseForType('startingSentence', 'too long for game')).toBe(
      'too long for ',
    );
    expect(clampPhraseForType('greeting', 'too long for game')).toBe(
      'too long for game',
    );
  });
});
