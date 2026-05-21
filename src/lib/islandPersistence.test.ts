import { describe, expect, it, beforeEach } from 'vitest';
import { normalizeIsland, saveIslandLocally } from './islandPersistence';
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
});
