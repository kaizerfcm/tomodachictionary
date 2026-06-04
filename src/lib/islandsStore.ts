import { migrateCharacter, type DictionaryData } from '../types';
import { clearStorage, loadFromStorage } from './storage';

const STORAGE_KEY = 'tomodict-islands-v2';

export interface IslandEntry {
  id: string;
  name: string;
  updatedAt: number;
  data: DictionaryData;
}

export interface IslandsStore {
  version: 2;
  activeIslandId: string;
  islands: IslandEntry[];
}

function normalizeIslandData(data: DictionaryData): DictionaryData {
  return {
    version: 1,
    characters: data.characters.map((c) => migrateCharacter(c)),
  };
}

function createIslandEntry(name: string, data?: DictionaryData): IslandEntry {
  return {
    id: crypto.randomUUID(),
    name,
    updatedAt: Date.now(),
    data: normalizeIslandData(data ?? { version: 1, characters: [] }),
  };
}

function defaultStore(): IslandsStore {
  const island = createIslandEntry('Island 1');
  return { version: 2, activeIslandId: island.id, islands: [island] };
}

function migrateLegacyStore(): IslandsStore | null {
  const legacy = loadFromStorage();
  if (!legacy) return null;
  clearStorage();
  if (legacy.characters.length === 0) return null;
  const island = createIslandEntry('Island 1', legacy);
  return { version: 2, activeIslandId: island.id, islands: [island] };
}

export function loadIslandsStore(): IslandsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IslandsStore;
      if (
        parsed.version === 2 &&
        Array.isArray(parsed.islands) &&
        parsed.islands.length > 0 &&
        parsed.activeIslandId
      ) {
        return {
          ...parsed,
          islands: parsed.islands.map((entry) => ({
            ...entry,
            data: normalizeIslandData(entry.data),
          })),
        };
      }
    }
  } catch {
    /* fall through */
  }

  const migrated = migrateLegacyStore();
  if (migrated) {
    saveIslandsStore(migrated);
    return migrated;
  }

  const store = defaultStore();
  saveIslandsStore(store);
  return store;
}

export function saveIslandsStore(store: IslandsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error(
        'Storage is full (try removing character photos or exporting then clearing data).',
      );
    }
    throw e;
  }
}

export function getActiveIsland(store: IslandsStore): IslandEntry {
  return (
    store.islands.find((i) => i.id === store.activeIslandId) ?? store.islands[0]
  );
}

export function setActiveIslandId(
  store: IslandsStore,
  id: string,
): IslandsStore {
  if (!store.islands.some((i) => i.id === id)) return store;
  return { ...store, activeIslandId: id };
}

export function updateActiveIslandData(
  store: IslandsStore,
  data: DictionaryData,
): IslandsStore {
  const normalized = normalizeIslandData(data);
  const now = Date.now();
  return {
    ...store,
    islands: store.islands.map((entry) =>
      entry.id === store.activeIslandId
        ? { ...entry, data: normalized, updatedAt: now }
        : entry,
    ),
  };
}

export function createNewIsland(
  store: IslandsStore,
  name?: string,
): IslandsStore {
  const label = name?.trim() || `Island ${store.islands.length + 1}`;
  const island = createIslandEntry(label);
  return {
    version: 2,
    activeIslandId: island.id,
    islands: [...store.islands, island],
  };
}

export function renameIsland(
  store: IslandsStore,
  id: string,
  name: string,
): IslandsStore {
  const trimmed = name.trim();
  if (!trimmed) return store;
  return {
    ...store,
    islands: store.islands.map((entry) =>
      entry.id === id ? { ...entry, name: trimmed } : entry,
    ),
  };
}

export function deleteIsland(
  store: IslandsStore,
  id: string,
): IslandsStore | null {
  if (store.islands.length <= 1) return null;
  const islands = store.islands.filter((entry) => entry.id !== id);
  const activeIslandId =
    store.activeIslandId === id ? islands[0].id : store.activeIslandId;
  return { version: 2, activeIslandId, islands };
}

export function addIslandWithData(
  store: IslandsStore,
  name: string,
  data: DictionaryData,
): IslandsStore {
  const island = createIslandEntry(name.trim() || `Island ${store.islands.length + 1}`, data);
  return {
    version: 2,
    activeIslandId: island.id,
    islands: [...store.islands, island],
  };
}

export function replaceActiveIslandData(
  store: IslandsStore,
  data: DictionaryData,
): IslandsStore {
  return updateActiveIslandData(store, data);
}
