import { describe, expect, it } from 'vitest';
import {
  parseGeneratedLevelUpRewards,
  parseGiftList,
  QUIRK_SUBTYPE_KEYS,
  quirksBySubtypeToString,
} from './livingTheDreamGifts';

describe('livingTheDreamGifts', () => {
  it('parses generated gifts with multiple prezzies and all quirk subtypes', () => {
    const quirks: Record<string, string> = {};
    for (const key of QUIRK_SUBTYPE_KEYS) {
      quirks[key] = 'Smiley';
    }
    quirks.walking = 'Walks Cutely';
    quirks.greeting = 'Greets Shyly';

    const parsed = parseGeneratedLevelUpRewards({
      goods: ['Guitar', 'Camera', 'Toy Sword'],
      quirks,
    });

    expect(parsed.song).toBe('');
    expect(parsed.interior).toBe('');
    expect(parsed.clothing).toBe('');
    expect(parsed.hat).toBe('');
    expect(parseGiftList(parsed.goods)).toEqual([
      'Guitar',
      'Camera',
      'Toy Sword',
    ]);
    expect(parseGiftList(parsed.quirks)).toHaveLength(QUIRK_SUBTYPE_KEYS.length);
  });

  it('serializes quirks by subtype in stable order', () => {
    const text = quirksBySubtypeToString({
      walking: 'Walks Cutely',
      face: 'Smiley',
    });
    expect(parseGiftList(text)).toEqual(['Walks Cutely', 'Smiley']);
  });
});
