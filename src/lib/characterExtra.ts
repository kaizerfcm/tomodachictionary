import type { Character } from '../types';

/** User-provided source / notes for AI prompts (optional). */
export function formatCharacterExtraBlock(character: Character): string {
  const extra = character.extra?.trim();
  if (!extra) return '';
  return `\nExtra (source / notes):\n${extra}\n`;
}

export function formatCharacterExtraSnapshot(character: Character): string {
  const extra = character.extra?.trim();
  if (!extra) return '';
  const short = extra.length > 140 ? `${extra.slice(0, 137)}...` : extra;
  return `; extra="${short.replace(/"/g, "'")}"`;
}
