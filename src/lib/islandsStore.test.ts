import { describe, expect, it, beforeEach } from 'vitest';
import {
  createNewIsland,
  loadIslandsStore,
  setActiveIslandId,
  updateActiveIslandData,
} from './islandsStore';
import { createCharacter } from '../types';

describe('islandsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a default island on first load', () => {
    const store = loadIslandsStore();
    expect(store.version).toBe(2);
    expect(store.islands).toHaveLength(1);
    expect(store.activeIslandId).toBe(store.islands[0].id);
  });

  it('switches active island and keeps data isolated', () => {
    let store = loadIslandsStore();
    const firstId = store.activeIslandId;
    store = createNewIsland(store, 'Island 2');
    const secondId = store.activeIslandId;
    expect(secondId).not.toBe(firstId);

    store = updateActiveIslandData(store, {
      version: 1,
      characters: [createCharacter('Only on two')],
    });

    store = setActiveIslandId(store, firstId);
    expect(
      store.islands.find((i) => i.id === firstId)?.data.characters,
    ).toEqual([]);

    store = setActiveIslandId(store, secondId);
    expect(
      store.islands.find((i) => i.id === secondId)?.data.characters[0].name,
    ).toBe('Only on two');
  });
});
