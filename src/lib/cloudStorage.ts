import type { DictionaryData } from '../types';
import { migrateCharacter } from '../types';
import { getSupabase } from './supabase';

const TABLE = 'island_data';

export async function loadIslandFromCloud(
  userId: string,
): Promise<DictionaryData | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) return null;
  const parsed = data.data as DictionaryData;
  if (parsed.version !== 1 || !Array.isArray(parsed.characters)) return null;
  return {
    ...parsed,
    characters: parsed.characters.map((c) => migrateCharacter(c)),
  };
}

export async function saveIslandToCloud(
  userId: string,
  island: DictionaryData,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      data: island,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
