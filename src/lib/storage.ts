import type { Character, DictionaryData } from '../types';
import { migrateCharacter } from '../types';

const STORAGE_KEY = 'tomodachi-dictionary-v1';

export function loadFromStorage(): DictionaryData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DictionaryData;
    if (data.version !== 1 || !Array.isArray(data.characters)) return null;
    return {
      ...data,
      characters: data.characters.map((c) =>
        migrateCharacter(c as Character),
      ),
    };
  } catch {
    return null;
  }
}

export function saveToStorage(data: DictionaryData): void {
  const normalized: DictionaryData = {
    version: 1,
    characters: data.characters.map((c) => migrateCharacter(c)),
  };
  const raw = JSON.stringify(normalized);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error(
        'Storage is full (try removing character photos or exporting then clearing data).',
      );
    }
    throw e;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
