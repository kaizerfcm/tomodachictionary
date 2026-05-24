import { describe, expect, it } from 'vitest';
import { emptyIsland, normalizeIsland } from '../lib/islandPersistence';
import { createCharacter } from '../types';

describe('useDictionary cloud sync invariants', () => {
  it('loaded island seeds pending snapshot including empty cast', () => {
    const loaded = emptyIsland();
    const pending = normalizeIsland(loaded);
    expect(pending.characters).toEqual([]);
  });

  it('loaded island with characters preserves data for sync snapshot', () => {
    const c = createCharacter('Futaba');
    const pending = normalizeIsland({ version: 1, characters: [c] });
    expect(pending.characters[0].name).toBe('Futaba');
  });
});
