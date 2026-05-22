import { PHRASE_TYPES, type Character, type PhraseType } from '../types';
import type { FullCharacterGeneration, Triplet } from './gemini/types';
import type { MissingNicknamePairs } from './missingNicknames';
import type { GeneratedMissingNicknames } from './gemini/types';
import { clampOutgoingNickname, clampPhraseForType, isShortPhraseType } from './textLimits';

const PHRASE_POOLS: Record<PhraseType, string[]> = {
  catchphrases: [
    'Yep!',
    'You know it!',
    'For sure!',
    'Absolutely!',
    'No doubt!',
  ],
  startingSentence: ['So,', 'Well,', 'Hey,', 'Um,', 'Oh!'],
  endingSentence: ['...', 'yeah.', 'right?', 'I guess.', 'huh.'],
  beforeEating: [
    'Smells good!',
    'Time to eat!',
    'Yum yum!',
    "Let's dig in!",
    'Bon appetit!',
  ],
  shoutAtSea: ['HELP!', 'YO HO!', 'AHOY!', 'HEY YOU!', 'OVER HERE!'],
  whenHappy: [
    'Yay!',
    'So happy!',
    'Best day!',
    'Life is good!',
    'Woohoo!',
  ],
  whenSad: [
    'Sigh...',
    'Oh no...',
    'Bummer...',
    'So blue...',
    'Heavy heart...',
  ],
  whenAngry: [
    'Grrr!',
    'Not cool!',
    'Seriously?!',
    'How dare!',
    'Unbelievable!',
  ],
  whileSleeping: ['Zzz...', 'Mmph...', 'Snore...', '...', 'Five more...'],
  greeting: ['Hey!', 'Hi there!', 'Hello!', 'Howdy!', 'Good to see you!'],
};

const DEFAULT_NICK_SUFFIXES = ['buddy', 'pal', 'friend', 'chief', 'sport'];
const OUTGOING_PATTERNS = ['', '-o', 'ie', 'ster', 'kins'];

function pickRandom<T>(pool: T[], exclude: Set<string>, keyFn: (v: T) => string): T {
  const available = pool.filter((v) => !exclude.has(keyFn(v).toLowerCase()));
  const list = available.length > 0 ? available : pool;
  return list[Math.floor(Math.random() * list.length)];
}

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function shortenName(name: string, max: number): string {
  const w = firstWord(name);
  if (w.length <= max) return w;
  return w.slice(0, max);
}

function extraTokens(extra?: string): string[] {
  if (!extra?.trim()) return [];
  return extra
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 12);
}

function personalizePhrase(
  template: string,
  characterName: string,
  extraWords: string[],
): string {
  let line = template;
  if (line.includes('{name}')) {
    line = line.replace(/\{name\}/g, firstWord(characterName));
  }
  if (extraWords.length > 0 && Math.random() > 0.6) {
    const word = extraWords[Math.floor(Math.random() * extraWords.length)];
    line = `${line} (${word})`;
  }
  return line;
}

export function generateLocalPhrase(
  character: Character,
  type: PhraseType,
): string {
  const existing = new Set(
    character.phrases[type].map((p) => p.trim().toLowerCase()).filter(Boolean),
  );
  const pool = PHRASE_POOLS[type];
  const tokens = extraTokens(character.extra);
  let attempts = 0;
  while (attempts < 12) {
    const template = pickRandom(pool, existing, (s) => s);
    let line = personalizePhrase(template, character.name, tokens);
    if (isShortPhraseType(type)) {
      line = clampPhraseForType(type, line);
    } else if (line.length > 80) {
      line = line.slice(0, 80);
    }
    const key = line.trim().toLowerCase();
    if (key && !existing.has(key)) return line;
    attempts += 1;
  }
  const fallback = personalizePhrase(pool[0], character.name, tokens);
  return isShortPhraseType(type)
    ? clampPhraseForType(type, fallback)
    : fallback.slice(0, 80);
}

export function generateLocalDefaultNickname(character: Character): string {
  const existing = new Set(
    character.nicknameDefaults.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  const tokens = extraTokens(character.extra);
  const base = shortenName(character.name, 6);
  const candidates = [
    ...tokens.map((t) => clampOutgoingNickname(t)),
    ...DEFAULT_NICK_SUFFIXES.map((s) => clampOutgoingNickname(`${base}${s}`)),
    clampOutgoingNickname(base),
    clampOutgoingNickname(`${base}-o`),
  ].filter(Boolean);
  for (const c of candidates) {
    if (!existing.has(c.toLowerCase())) return c;
  }
  return clampOutgoingNickname(`${base}${Math.floor(Math.random() * 9)}`);
}

export function generateLocalOutgoingNickname(
  subject: Character,
  target: Character,
): string {
  const existing = new Set(
    (subject.nicknames[target.id] ?? [])
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  );
  const sub = shortenName(subject.name, 4);
  const tgt = shortenName(target.name, 8);
  const candidates = [
    clampOutgoingNickname(tgt),
    clampOutgoingNickname(`${tgt}-o`),
    ...OUTGOING_PATTERNS.map((p) =>
      clampOutgoingNickname(p ? `${tgt}${p}` : tgt),
    ),
    clampOutgoingNickname(`${sub}'s pal`),
    clampOutgoingNickname(`lil ${tgt}`),
  ].filter(Boolean);
  for (const c of candidates) {
    if (!existing.has(c.toLowerCase())) return c;
  }
  return clampOutgoingNickname(`${tgt}${Math.floor(Math.random() * 9)}`);
}

export function generateLocalIncomingNickname(
  speaker: Character,
  subject: Character,
): string {
  const existing = new Set(
    (speaker.nicknames[subject.id] ?? [])
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  );
  const sub = shortenName(subject.name, 10);
  const candidates = [
    sub,
    `${sub}-chan`,
    `${sub}ie`,
    `dear ${sub}`,
    `hey ${sub}`,
    firstWord(speaker.name) === firstWord(subject.name) ? `${sub} Jr` : sub,
  ].map((s) => s.trim()).filter(Boolean);
  for (const c of candidates) {
    if (!existing.has(c.toLowerCase())) return c;
  }
  return `${sub}${Math.floor(Math.random() * 9)}`;
}

function tripletFrom(fn: () => string): Triplet {
  const a = fn();
  let b = fn();
  let c = fn();
  const seen = new Set([a.toLowerCase()]);
  if (seen.has(b.toLowerCase())) b = fn();
  seen.add(b.toLowerCase());
  if (seen.has(c.toLowerCase())) c = fn();
  return [a, b, c];
}

/** Free starter pack for a new islander (no API). */
export function generateQuickFillCharacter(
  name: string,
  extra: string | undefined,
  existingCharacters: Character[],
): FullCharacterGeneration {
  const stub: Character = {
    id: 'quick-fill',
    name,
    extra,
    phrases: Object.fromEntries(
      PHRASE_TYPES.map(({ key }) => [key, [] as string[]]),
    ) as Character['phrases'],
    nicknameDefaults: [],
    nicknames: {},
    createdAt: Date.now(),
  };

  const phrases = Object.fromEntries(
    PHRASE_TYPES.map(({ key }) => {
      const type = key as PhraseType;
      return [
        key,
        tripletFrom(() => generateLocalPhrase(stub, type)),
      ];
    }),
  ) as FullCharacterGeneration['phrases'];

  const byTargetName: Record<string, Triplet> = {};
  for (const target of existingCharacters) {
    const tStub = { ...stub, nicknames: {} };
    byTargetName[target.name] = tripletFrom(() =>
      generateLocalOutgoingNickname(tStub, target),
    );
  }

  return {
    phrases,
    outgoing: {
      nicknameDefault: tripletFrom(() => generateLocalDefaultNickname(stub)),
      byTargetName,
    },
    incoming: { bySpeakerName: {} },
  };
}

export function generateLocalMissingNicknames(
  subject: Character,
  missing: MissingNicknamePairs,
): GeneratedMissingNicknames {
  const outgoing: Record<string, string> = {};
  for (const target of missing.missingOutgoing) {
    outgoing[target.name] = generateLocalOutgoingNickname(subject, target);
  }
  const incoming: Record<string, string> = {};
  for (const speaker of missing.missingIncoming) {
    incoming[speaker.name] = generateLocalIncomingNickname(speaker, subject);
  }
  return { outgoing, incoming };
}
