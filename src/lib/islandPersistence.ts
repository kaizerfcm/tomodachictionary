import type { Character, DictionaryData } from '../types';
import { migrateCharacter } from '../types';
import { loadIslandFromCloud, saveIslandToCloud } from './cloudStorage';
import { loadFromStorage, saveToStorage } from './storage';
import { getSupabase, isSupabaseConfigured } from './supabase';

export function normalizeIsland(data: DictionaryData): DictionaryData {
  return {
    version: 1,
    characters: data.characters.map((c) => migrateCharacter(c)),
  };
}

export function saveIslandLocally(data: DictionaryData): void {
  saveToStorage(normalizeIsland(data));
}

export async function saveIslandLocallySafe(
  data: DictionaryData,
): Promise<string | null> {
  try {
    saveIslandLocally(data);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Failed to save locally';
  }
}

export async function saveIslandToCloudSafe(
  userId: string,
  data: DictionaryData,
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return 'Cloud sync is not configured';
  }
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) return sessionError.message;
  if (!sessionData.session) {
    return 'Not signed in — sign in again to sync';
  }

  try {
    await saveIslandToCloud(userId, normalizeIsland(data));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Failed to sync to cloud';
  }
}

export async function loadIslandData(
  storageMode: 'local' | 'cloud',
  userId: string | null | undefined,
): Promise<DictionaryData | null> {
  if (storageMode === 'cloud' && userId && isSupabaseConfigured()) {
    try {
      const cloud = await loadIslandFromCloud(userId);
      if (cloud && cloud.characters.length > 0) {
        saveIslandLocally(cloud);
        return cloud;
      }
    } catch {
      /* fall through to local backup */
    }
  }

  const local = loadFromStorage();
  if (local && local.characters.length > 0) {
    if (storageMode === 'cloud' && userId && isSupabaseConfigured()) {
      void saveIslandToCloudSafe(userId, local);
    }
    return local;
  }

  return null;
}

export function backfillCharacters(chars: Character[]): Character[] {
  return chars.map((c) => migrateCharacter(c));
}
