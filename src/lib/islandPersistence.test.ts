import { describe, expect, it, beforeEach } from 'vitest';
import {
  emptyIsland,
  loadIslandData,
  normalizeIsland,
  saveIslandLocally,
} from './islandPersistence';
import { loadFromStorage } from './storage';
import { createCharacter } from '../types';

describe('island persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes island data', () => {
    const c = createCharacter('Test');
    const data = normalizeIsland({ version: 1, characters: [c] });
    expect(data.characters[0].name).toBe('Test');
  });

  it('saveIslandLocally writes to localStorage', () => {
    const c = createCharacter('Bob');
    saveIslandLocally({ version: 1, characters: [c] });
    const loaded = loadFromStorage();
    expect(loaded?.characters[0].name).toBe('Bob');
  });

  it('loadIslandData in local mode reads localStorage only', async () => {
    const c = createCharacter('LocalOnly');
    saveIslandLocally({ version: 1, characters: [c] });
    const loaded = await loadIslandData('local', null);
    expect(loaded.characters.map((x) => x.name)).toEqual(['LocalOnly']);
  });

  it('loadIslandData in local mode returns empty when nothing saved', async () => {
    const loaded = await loadIslandData('local', undefined);
    expect(loaded.characters).toEqual([]);
  });

  it('emptyIsland returns versioned empty cast', () => {
    expect(emptyIsland()).toEqual({ version: 1, characters: [] });
  });
});
