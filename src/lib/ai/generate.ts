import { MISSING_NICKNAMES_CHUNK_SIZE } from '../../constants';
import type { Character } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import { buildMissingIslandNicknamesPrompt } from '../gemini/prompts';
import type { GeneratedMissingNicknames } from '../gemini/types';
import {
  chunkMissingNicknamePairs,
  type MissingNicknamePairs,
} from '../missingNicknames';
import {
  applyShortTextLimitsToGeneration,
  clampOutgoingNickname,
  clampPhraseForType,
} from '../textLimits';
import type {
  FullCharacterGeneration,
  GeneratedPhrases,
  Triplet,
} from '../gemini/types';
import { callGemini } from './callModel';
import { AiError } from './errors';
import { AI_TOKENS } from './tokenLimits';

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    const hint =
      jsonStr.length > 0 && !jsonStr.endsWith('}')
        ? ' Response may have been cut off — try Fill missing again.'
        : '';
    throw new AiError(
      `Invalid JSON from model${hint} ${e instanceof Error ? e.message : ''}`.trim(),
    );
  }
}

/** Coerce model output into a string list (handles strings, short arrays, wrapped objects). */
export function normalizeTripletInput(value: unknown): string[] {
  if (value == null) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes('|')) {
      return trimmed
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item == null) return [];
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        for (const key of ['line', 'text', 'phrase', 'value'] as const) {
          const nested = obj[key];
          if (typeof nested === 'string' && nested.trim()) {
            return [nested.trim()];
          }
        }
      }
      const asString = String(item).trim();
      return asString ? [asString] : [];
    });
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['options', 'lines', 'values', 'items'] as const) {
      if (Array.isArray(obj[key])) {
        return normalizeTripletInput(obj[key]);
      }
    }
  }

  const asString = String(value).trim();
  return asString ? [asString] : [];
}

function assertTriplet(value: unknown, label: string): Triplet {
  const items = normalizeTripletInput(value);
  if (items.length === 0) {
    throw new AiError(`Invalid triplet for ${label}`);
  }

  while (items.length < 3) {
    items.push('');
  }

  return [items[0], items[1], items[2]];
}

function parsePhrases(raw: Record<string, unknown>): GeneratedPhrases {
  const phrases = {} as GeneratedPhrases;
  for (const { key } of PHRASE_TYPES) {
    const type = key as PhraseType;
    const triplet = assertTriplet(raw[key], key);
    phrases[type] = triplet.map((line) => clampPhraseForType(type, line)) as Triplet;
  }
  return phrases;
}

function parseTripletsMap(
  raw: Record<string, unknown> | undefined,
  clampNickname = false,
): Record<string, Triplet> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, Triplet> = {};
  for (const [name, val] of Object.entries(raw)) {
    const triplet = assertTriplet(val, name);
    out[name] = clampNickname
      ? (triplet.map(clampOutgoingNickname) as Triplet)
      : triplet;
  }
  return out;
}

function assertLine(raw: Record<string, unknown>, key: string): string {
  const line = String(raw[key] ?? '').trim();
  if (!line) throw new AiError(`Empty ${key} in response`);
  return line;
}

export async function generateFullCharacter(
  apiKey: string,
  prompt: string,
): Promise<FullCharacterGeneration> {
  const raw = parseJson<Record<string, unknown>>(
    await callGemini(apiKey, {
      prompt,
      maxOutputTokens: AI_TOKENS.fullCharacter,
    }),
  );
  const phrasesRaw = raw.phrases as Record<string, unknown>;
  const outgoingRaw = raw.outgoing as Record<string, unknown>;
  const incomingRaw = (raw.incoming as Record<string, unknown>) ?? {};

  if (!phrasesRaw || !outgoingRaw) {
    throw new AiError('Missing phrases or outgoing in response');
  }

  const generation: FullCharacterGeneration = {
    phrases: parsePhrases(phrasesRaw),
    outgoing: {
      nicknameDefault: assertTriplet(
        outgoingRaw.nicknameDefault,
        'nicknameDefault',
      ).map(clampOutgoingNickname) as Triplet,
      byTargetName: parseTripletsMap(
        outgoingRaw.byTargetName as Record<string, unknown>,
        true,
      ),
    },
    incoming: {
      bySpeakerName: parseTripletsMap(
        incomingRaw.bySpeakerName as Record<string, unknown>,
      ),
    },
  };
  return applyShortTextLimitsToGeneration(generation);
}

export async function generateOnePhrase(
  apiKey: string,
  prompt: string,
  phraseType?: PhraseType,
): Promise<string> {
  const raw = parseJson<Record<string, unknown>>(
    await callGemini(apiKey, {
      prompt,
      maxOutputTokens: AI_TOKENS.singleLine,
    }),
  );
  const line = assertLine(raw, 'line');
  return phraseType ? clampPhraseForType(phraseType, line) : line;
}

export async function generateOneNickname(
  apiKey: string,
  prompt: string,
  clampToShort = false,
): Promise<string> {
  const raw = parseJson<Record<string, unknown>>(
    await callGemini(apiKey, {
      prompt,
      maxOutputTokens: AI_TOKENS.singleLine,
    }),
  );
  const nick = assertLine(raw, 'nickname');
  return clampToShort ? clampOutgoingNickname(nick) : nick;
}

function parseNicknameStringMap(
  raw: unknown,
  clampOutgoing: boolean,
): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [name, val] of Object.entries(raw as Record<string, unknown>)) {
    const nick = String(val ?? '').trim();
    if (!nick) continue;
    out[name] = clampOutgoing ? clampOutgoingNickname(nick) : nick;
  }
  return out;
}

export async function generateMissingIslandNicknames(
  apiKey: string,
  prompt: string,
): Promise<GeneratedMissingNicknames> {
  const raw = parseJson<Record<string, unknown>>(
    await callGemini(apiKey, {
      prompt,
      maxOutputTokens: AI_TOKENS.missingNicknames,
    }),
  );
  return {
    outgoing: parseNicknameStringMap(raw.outgoing, true),
    incoming: parseNicknameStringMap(raw.incoming, false),
  };
}

/** Fills many missing nicknames in chunks so output is not truncated. */
export async function generateMissingIslandNicknamesBatched(
  apiKey: string,
  subject: Character,
  allCharacters: Character[],
  missing: MissingNicknamePairs,
): Promise<GeneratedMissingNicknames> {
  const chunks = chunkMissingNicknamePairs(
    missing,
    MISSING_NICKNAMES_CHUNK_SIZE,
  );
  const merged: GeneratedMissingNicknames = { outgoing: {}, incoming: {} };

  for (const chunk of chunks) {
    const prompt = buildMissingIslandNicknamesPrompt(
      subject,
      allCharacters,
      chunk,
      { compactCast: true },
    );
    const part = await generateMissingIslandNicknames(apiKey, prompt);
    Object.assign(merged.outgoing, part.outgoing);
    Object.assign(merged.incoming, part.incoming);
  }

  return merged;
}
