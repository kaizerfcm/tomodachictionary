import { getSupabase, isSupabaseConfigured } from './supabase';

export const COMMUNITY_NICKNAME_LIMIT = 12;

export function filterNewCommunityNicknames(
  existing: string[],
  incoming: string[],
  limit = COMMUNITY_NICKNAME_LIMIT,
): string[] {
  const seen = new Set(
    existing.map((n) => n.trim().toLowerCase()).filter(Boolean),
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

export function canUseCommunityNicknames(signedIn: boolean): boolean {
  return signedIn && isSupabaseConfigured();
}

export async function fetchCommunityDefaultNicknames(
  characterName: string,
): Promise<string[]> {
  const name = characterName.trim();
  if (!name) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('community-nicknames', {
    body: { characterName: name, kind: 'default' },
  });

  if (error) throw error;

  const payload = data as { nicknames?: unknown } | null;
  if (!payload || !Array.isArray(payload.nicknames)) return [];
  return payload.nicknames.filter(
    (s): s is string => typeof s === 'string' && s.trim() !== '',
  );
}

export async function fetchCommunityOutgoingNicknames(
  characterName: string,
  targetName: string,
): Promise<string[]> {
  const speaker = characterName.trim();
  const target = targetName.trim();
  if (!speaker || !target) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('community-nicknames', {
    body: {
      characterName: speaker,
      targetName: target,
      kind: 'outgoing',
    },
  });

  if (error) throw error;

  const payload = data as { nicknames?: unknown } | null;
  if (!payload || !Array.isArray(payload.nicknames)) return [];
  return payload.nicknames.filter(
    (s): s is string => typeof s === 'string' && s.trim() !== '',
  );
}
