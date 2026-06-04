import type { Character, DictionaryData } from '../types';
import { migrateCharacter } from '../types';
import {
  getActiveIsland,
  loadIslandsStore,
  saveIslandsStore,
  updateActiveIslandData,
  type IslandsStore,
} from './islandsStore';

export function emptyIsland(): DictionaryData {
  return { version: 1, characters: [] };
}

export function normalizeIsland(data: DictionaryData): DictionaryData {
  return {
    version: 1,
    characters: data.characters.map((c) => migrateCharacter(c)),
  };
}

export async function saveIslandLocallySafe(
  data: DictionaryData,
): Promise<string | null> {
  try {
    const store = loadIslandsStore();
    saveIslandsStore(updateActiveIslandData(store, data));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Failed to save locally';
  }
}

export async function loadIslandData(): Promise<DictionaryData> {
  const store = loadIslandsStore();
  return normalizeIsland(getActiveIsland(store).data);
}

export function backfillCharacters(chars: Character[]): Character[] {
  return chars.map((c) => migrateCharacter(c));
}

export function getIslandsStoreSnapshot(): IslandsStore {
  return loadIslandsStore();
}

export function persistIslandsStore(store: IslandsStore): void {
  saveIslandsStore(store);
}
