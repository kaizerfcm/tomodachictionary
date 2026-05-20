export const PHRASE_TYPES = [
  { key: 'catchphrases', label: 'Catchphrases' },
  { key: 'startingSentence', label: 'Starting a sentence' },
  { key: 'endingSentence', label: 'Ending a sentence' },
  { key: 'beforeEating', label: 'Before eating' },
  { key: 'shoutAtSea', label: 'Shout at the sea' },
  { key: 'whenHappy', label: 'When happy' },
  { key: 'whenSad', label: 'When sad' },
  { key: 'whenAngry', label: 'When angry' },
  { key: 'whileSleeping', label: 'While sleeping' },
  { key: 'greeting', label: 'Greeting' },
] as const;

export type PhraseType = (typeof PHRASE_TYPES)[number]['key'];

export interface Character {
  id: string;
  name: string;
  phrases: Record<PhraseType, string[]>;
  /** Fallback label for islanders without a specific nickname. */
  nicknameDefault: string;
  nicknames: Record<string, string>;
}

export interface DictionaryData {
  version: 1;
  characters: Character[];
}

export function emptyPhrases(): Record<PhraseType, string[]> {
  const phrases = {} as Record<PhraseType, string[]>;
  for (const { key } of PHRASE_TYPES) {
    phrases[key] = [];
  }
  return phrases;
}

export function createCharacter(name: string, id?: string): Character {
  return {
    id: id ?? crypto.randomUUID(),
    name,
    phrases: emptyPhrases(),
    nicknameDefault: '',
    nicknames: {},
  };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
