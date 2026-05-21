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

export async function areSeedsAvailable(): Promise<boolean> {
  try {
    const [md, nick] = await Promise.all([
      fetch('/seed.md', { method: 'HEAD' }),
      fetch('/nicknames-seed.json', { method: 'HEAD' }),
    ]);
    return md.ok && nick.ok;
  } catch {
    return false;
  }
}

export async function fetchSeedMarkdown(): Promise<string | null> {
  const res = await fetch('/seed.md');
  if (!res.ok) return null;
  return res.text();
}

export async function fetchNicknameSeed(): Promise<string | null> {
  const res = await fetch('/nicknames-seed.json');
  if (!res.ok) return null;
  return res.text();
}
