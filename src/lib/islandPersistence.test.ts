import { describe, expect, it, beforeEach } from 'vitest';
import {
  emptyIsland,
  loadIslandData,
  normalizeIsland,
  saveIslandLocallySafe,
} from './islandPersistence';
import { loadIslandsStore } from './islandsStore';
import { createCharacter } from '../types';
import { saveToStorage } from './storage';

describe('island persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes island data', () => {
    const c = createCharacter('Test');
    const data = normalizeIsland({ version: 1, characters: [c] });
    expect(data.characters[0].name).toBe('Test');
  });

  it('saveIslandLocallySafe writes to islands store', async () => {
    loadIslandsStore();
    const c = createCharacter('Bob');
    const err = await saveIslandLocallySafe({ version: 1, characters: [c] });
    expect(err).toBeNull();
    const loaded = await loadIslandData();
    expect(loaded.characters[0].name).toBe('Bob');
  });

  it('loadIslandData returns empty when nothing saved', async () => {
    const loaded = await loadIslandData();
    expect(loaded.characters).toEqual([]);
  });

  it('migrates legacy v1 storage into islands store', async () => {
    const c = createCharacter('Legacy');
    saveToStorage({ version: 1, characters: [c] });
    const loaded = await loadIslandData();
    expect(loaded.characters.map((x) => x.name)).toEqual(['Legacy']);
    const store = loadIslandsStore();
    expect(store.islands).toHaveLength(1);
    expect(store.islands[0].name).toBe('Island 1');
  });

  it('emptyIsland returns versioned empty cast', () => {
    expect(emptyIsland()).toEqual({ version: 1, characters: [] });
  });
});
