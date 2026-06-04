import { MAX_CHARACTER_EXTRA_LENGTH, MAX_PHRASES_PER_TYPE } from './constants';
import { sanitizeCharacterNicknames } from './lib/nicknames';

export const PHRASE_TYPES = [
  { key: 'catchphrases', label: 'Catchphrases' },
  { key: 'startingSentence', label: 'Starting a sentence' },
  { key: 'endingSentence', label: 'Ending a sentence' },
  { key: 'beforeEating', label: 'Before eating' },
  { key: 'shoutAtSea', label: 'Loud shout' },
  { key: 'whenHappy', label: 'When happy' },
  { key: 'whenSad', label: 'When sad' },
  { key: 'whenAngry', label: 'When angry' },
  { key: 'whileSleeping', label: 'While sleeping' },
  { key: 'greeting', label: 'Greeting' },
] as const;

export type PhraseType = (typeof PHRASE_TYPES)[number]['key'];

export interface LevelUpRewards {
  /** Expression gift (Living the Dream). Stored as `song` for export compatibility. */
  song: string;
  interior: string;
  clothing: string;
  /** Pocket money or Kid-O-Matic / Age-O-Matic. Stored as `hat` for export compatibility. */
  hat: string;
  /** Prezzie / good. */
  goods: string;
  /** Little quirk. */
  quirks: string;
}

/** @deprecated Use LevelUpRewards — UI label is "Gifts". */
export type IslanderGifts = LevelUpRewards;

export type InteractionTopicKind = 'person' | 'thing' | 'activity' | 'other';

export interface InteractionTopic {
  text: string;
  kind: InteractionTopicKind;
}

export interface Character {
  id: string;
  name: string;
  phrases: Record<PhraseType, string[]>;
  /** Options for how this character addresses new / unspecified islanders. */
  nicknameDefaults: string[];
  /** targetId → list of ways this character calls them. */
  nicknames: Record<string, string[]>;
  /** Suggested level-up gifts (Living the Dream). */
  levelUpRewards?: LevelUpRewards;
  /** targetId → conversation topic with kind. */
  interactionTopics?: Record<string, InteractionTopic>;
  /** Tiny JPEG data URL (see lib/avatar). */
  avatar?: string;
  /** Optional source, origin, or notes to guide AI generation. */
  extra?: string;
  /** Unix ms — used for “date added” sort. */
  createdAt: number;
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

type LegacyCharacter = Omit<
  Character,
  'nicknameDefaults' | 'nicknames' | 'createdAt'
> & {
  nicknameDefaults?: string[];
  nicknameDefault?: string;
  nicknames?: Record<string, string | string[]>;
  createdAt?: number;
};

/** Migrate legacy single-string nicknames to arrays. */
export function migrateCharacter(raw: LegacyCharacter | Character): Character {
  let nicknameDefaults: string[] = [];
  if (Array.isArray(raw.nicknameDefaults)) {
    nicknameDefaults = raw.nicknameDefaults.map((s) => s.trim()).filter(Boolean);
  } else {
    const legacy = raw as LegacyCharacter;
    if (
      typeof legacy.nicknameDefault === 'string' &&
      legacy.nicknameDefault.trim()
    ) {
      nicknameDefaults = [legacy.nicknameDefault.trim()];
    }
  }

  const nicknames: Record<string, string[]> = {};
  const src = raw.nicknames ?? {};
  for (const [targetId, val] of Object.entries(src)) {
    if (Array.isArray(val)) {
      const list = val.map((s) => s.trim()).filter(Boolean);
      if (list.length) nicknames[targetId] = list;
    } else if (typeof val === 'string' && val.trim()) {
      nicknames[targetId] = [val.trim()];
    }
  }

  const phrases = emptyPhrases();
  for (const { key } of PHRASE_TYPES) {
    const list = raw.phrases?.[key];
    if (Array.isArray(list)) {
      phrases[key] = list.slice(0, MAX_PHRASES_PER_TYPE);
    }
  }

  const avatar =
    typeof raw.avatar === 'string' && raw.avatar.startsWith('data:image/')
      ? raw.avatar
      : undefined;

  const createdAt =
    typeof (raw as Character).createdAt === 'number'
      ? (raw as Character).createdAt
      : 0;

  const extra =
    typeof (raw as Character).extra === 'string'
      ? (raw as Character).extra!.trim().slice(0, MAX_CHARACTER_EXTRA_LENGTH) ||
          undefined
      : undefined;

  const levelUpRewards: LevelUpRewards = {
    song: String((raw as any).levelUpRewards?.song ?? '').trim(),
    interior: String((raw as any).levelUpRewards?.interior ?? '').trim(),
    clothing: String((raw as any).levelUpRewards?.clothing ?? '').trim(),
    hat: String((raw as any).levelUpRewards?.hat ?? '').trim(),
    goods: String((raw as any).levelUpRewards?.goods ?? '').trim(),
    quirks: String((raw as any).levelUpRewards?.quirks ?? '').trim(),
  };

  const interactionTopics: Record<string, InteractionTopic> = {};
  const srcTopics = (raw as any).interactionTopics ?? {};
  for (const [targetId, val] of Object.entries(srcTopics)) {
    if (typeof val === 'string') {
      const text = val.trim();
      if (text) interactionTopics[targetId] = { text, kind: 'other' };
      continue;
    }
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      const text =
        typeof obj.text === 'string'
          ? obj.text.trim()
          : typeof obj.topic === 'string'
            ? obj.topic.trim()
            : '';
      if (!text) continue;
      const kindRaw = obj.kind;
      const kind =
        kindRaw === 'person' ||
        kindRaw === 'thing' ||
        kindRaw === 'activity' ||
        kindRaw === 'other'
          ? kindRaw
          : 'other';
      interactionTopics[targetId] = { text, kind };
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    phrases,
    ...sanitizeCharacterNicknames({ nicknameDefaults, nicknames }),
    levelUpRewards,
    interactionTopics,
    avatar,
    extra,
    createdAt,
  };
}

export function createCharacter(
  name: string,
  id?: string,
  extra?: string,
): Character {
  const trimmedExtra = extra?.trim();
  return {
    id: id ?? crypto.randomUUID(),
    name,
    phrases: emptyPhrases(),
    nicknameDefaults: [],
    nicknames: {},
    levelUpRewards: {
      song: '',
      interior: '',
      clothing: '',
      hat: '',
      goods: '',
      quirks: '',
    },
    interactionTopics: {},
    extra: trimmedExtra
      ? trimmedExtra.slice(0, MAX_CHARACTER_EXTRA_LENGTH)
      : undefined,
    createdAt: Date.now(),
  };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
