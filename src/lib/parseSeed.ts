import {
  type Character,
  type PhraseType,
  createCharacter,
  emptyPhrases,
  PHRASE_TYPES,
} from '../types';

const SECTION_LABEL_TO_KEY: Record<string, PhraseType> = {
  catchphrases: 'catchphrases',
  'starting a sentence': 'startingSentence',
  'ending a sentence': 'endingSentence',
  'before eating': 'beforeEating',
  'shout at the sea': 'shoutAtSea',
  'when happy': 'whenHappy',
  'when sad': 'whenSad',
  'when angry': 'whenAngry',
  'while sleeping': 'whileSleeping',
  greeting: 'greeting',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function unescapeText(text: string): string {
  return text.replace(/\\(.)/g, '$1');
}

function parsePhraseLine(line: string): string | null {
  const trimmed = line.trim();
  const quoted = trimmed.match(/^\*\s*"(.+)"\s*$/);
  if (quoted) return unescapeText(quoted[1]);
  const plain = trimmed.match(/^\*\s+(.+)$/);
  if (plain) return unescapeText(plain[1]);
  return null;
}

function parseSectionHeader(line: string): PhraseType | null {
  const match = line.match(/\*\*([^*]+):\*\*/);
  if (!match) return null;
  const label = match[1].trim().toLowerCase();
  return SECTION_LABEL_TO_KEY[label] ?? null;
}

export function parseSeedMarkdown(markdown: string): Character[] {
  const blocks = markdown.split(/^### \*\*(.+?)\*\*/m).slice(1);
  const usedIds = new Set<string>();
  const characters: Character[] = [];

  for (let i = 0; i < blocks.length; i += 2) {
    const rawName = blocks[i]?.trim();
    const body = blocks[i + 1] ?? '';
    if (!rawName) continue;

    let id = slugify(rawName);
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    usedIds.add(id);

    const phrases = emptyPhrases();
    let currentType: PhraseType | null = null;

    for (const line of body.split('\n')) {
      const section = parseSectionHeader(line);
      if (section) {
        currentType = section;
        continue;
      }
      if (!currentType) continue;
      const phrase = parsePhraseLine(line);
      if (phrase) phrases[currentType].push(phrase);
    }

    characters.push({
      ...createCharacter(rawName, id),
      phrases,
    });
  }

  return characters;
}

export function validateParsed(characters: Character[]): void {
  for (const c of characters) {
    for (const { key } of PHRASE_TYPES) {
      if (!Array.isArray(c.phrases[key])) {
        throw new Error(`Missing phrase type ${key} for ${c.name}`);
      }
    }
  }
}
