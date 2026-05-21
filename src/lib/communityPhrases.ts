import type { PhraseType } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

export const COMMUNITY_SUGGESTION_LIMIT = 12;

/** Drop blanks and phrases the user already has (case-insensitive). */
export function filterNewCommunitySuggestions(
  existing: string[],
  incoming: string[],
  limit = COMMUNITY_SUGGESTION_LIMIT,
): string[] {
  const seen = new Set(
    existing.map((p) => p.trim().toLowerCase()).filter(Boolean),
  );
  const out: string[] = [];
  for (const raw of incoming) {
    const text = raw.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function canUseCommunityPhrases(
  signedIn: boolean,
): boolean {
  return signedIn && isSupabaseConfigured();
}

export async function fetchCommunityPhraseSuggestions(
  characterName: string,
  phraseType: PhraseType,
): Promise<string[]> {
  const name = characterName.trim();
  if (!name) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('community-phrases', {
    body: { characterName: name, phraseType },
  });

  if (error) throw error;

  const payload = data as { phrases?: unknown } | null;
  if (!payload || !Array.isArray(payload.phrases)) return [];
  return payload.phrases.filter(
    (s): s is string => typeof s === 'string' && s.trim() !== '',
  );
}
