import { migrateCharacter, type Character } from '../types';

/** Assign createdAt from save order when missing (legacy data). */
export function backfillCreatedAt(characters: Character[]): Character[] {
  const base = Date.now();
  return characters.map((raw, index) => {
    const c = migrateCharacter(raw);
    if (c.createdAt > 0) return c;
    return { ...c, createdAt: base - (characters.length - index) * 1000 };
  });
}
