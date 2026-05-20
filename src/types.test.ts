import { describe, expect, it } from 'vitest';
import { emptyPhrases, migrateCharacter } from './types';

describe('migrateCharacter', () => {
  it('migrates legacy single nickname fields', () => {
    const c = migrateCharacter({
      id: '1',
      name: 'Test',
      phrases: emptyPhrases(),
      nicknameDefault: ' pal ',
      nicknames: { t2: 'buddy' },
    });
    expect(c.nicknameDefaults).toEqual(['pal']);
    expect(c.nicknames.t2).toEqual(['buddy']);
    expect(c.createdAt).toBe(0);
  });

  it('keeps avatar data URL', () => {
    const url = 'data:image/jpeg;base64,/9j/x';
    const c = migrateCharacter({
      id: '1',
      name: 'A',
      phrases: emptyPhrases(),
      nicknameDefaults: [],
      nicknames: {},
      avatar: url,
    });
    expect(c.avatar).toBe(url);
  });
});
