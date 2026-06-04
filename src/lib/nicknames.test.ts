import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import { dedupeNicknames, getEffectiveNickname, sanitizeCharacterNicknames } from './nicknames';

describe('nicknames', () => {
  it('dedupes case-insensitively and caps count', () => {
    const list = dedupeNicknames(['A', 'a', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']);
    expect(list).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });

  it('sanitizes defaults and per-target nicknames', () => {
    const result = sanitizeCharacterNicknames({
      nicknameDefaults: ['Pal', 'pal', 'Buddy'],
      nicknames: {
        a: ['Ace', 'ace'],
        b: ['', 'Bob'],
      },
    });
    expect(result.nicknameDefaults).toEqual(['Pal', 'Buddy']);
    expect(result.nicknames).toEqual({ a: ['Ace'], b: ['Bob'] });
  });

  it('uses first specific nickname then default', () => {
    const speaker = createCharacter('Speaker');
    const target = createCharacter('Target');
    speaker.nicknameDefaults = ['buddy'];
    speaker.nicknames[target.id] = ['sport'];
    expect(getEffectiveNickname(speaker, target)).toBe('sport');
  });
});
