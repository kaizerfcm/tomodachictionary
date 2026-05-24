import { MISSING_NICKNAMES_CHUNK_SIZE } from '../../constants';
import type { Character } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import {
  buildFullCharacterNicknamesPrompt,
  buildFullCharacterPhrasesPrompt,
  buildMissingIslandNicknamesPrompt,
} from '../gemini/prompts';
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
  GeneratedOutgoingNicknames,
  GeneratedPhrases,
  Triplet,
} from '../gemini/types';
import { callGemini } from './callModel';
import { AiError } from './errors';
import { AI_TOKENS } from './tokenLimits';

const GENERIC_NICKNAME =
  /^(pal|buddy|friend|man|dude|bro|chief|sport|kid|mate|homie|hey|you)$/i;

function isGenericNickname(value: string): boolean {
  return GENERIC_NICKNAME.test(value.trim());
}

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

function assertSingleLine(value: unknown, label: string): string {
  const items = normalizeTripletInput(value);
  const line = items[0]?.trim() ?? '';
  if (!line) {
    throw new AiError(`Empty line for ${label}`);
  }
  return line;
}

function singleToTriplet(line: string): Triplet {
  return [line, '', ''];
}

function parsePhrasesSingles(raw: Record<string, unknown>): GeneratedPhrases {
  const phrases = {} as GeneratedPhrases;
  for (const { key } of PHRASE_TYPES) {
    const type = key as PhraseType;
    const line = assertSingleLine(raw[key], key);
    phrases[type] = singleToTriplet(clampPhraseForType(type, line));
  }
  return phrases;
}

function parseOutgoingSingles(
  raw: Record<string, unknown>,
  options?: { includeDefaults?: boolean },
): GeneratedOutgoingNicknames {
  const includeDefaults = options?.includeDefaults ?? true;
  const byTargetRaw = raw.byTargetName as Record<string, unknown> | undefined;
  const byTargetName: Record<string, Triplet> = {};

  for (const [name, val] of Object.entries(byTargetRaw ?? {})) {
    const line = assertSingleLine(val, name);
    byTargetName[name] = singleToTriplet(clampOutgoingNickname(line));
  }

  return {
    nicknameDefault: includeDefaults
      ? singleToTriplet(
          clampOutgoingNickname(
            assertSingleLine(raw.nicknameDefault, 'nicknameDefault'),
          ),
        )
      : (['', '', ''] as Triplet),
    byTargetName,
  };
}

function outgoingHasGenericNicknames(outgoing: GeneratedOutgoingNicknames): boolean {
  const lines = [
    ...outgoing.nicknameDefault,
    ...Object.values(outgoing.byTargetName).flat(),
  ];
  return lines.some((line) => line.trim() && isGenericNickname(line));
}

async function generateCharacterPhrases(
  apiKey: string,
  name: string,
  extra?: string,
): Promise<GeneratedPhrases> {
  const raw = parseJson<{ phrases: Record<string, unknown> }>(
    await callGemini(apiKey, {
      prompt: buildFullCharacterPhrasesPrompt(name, extra),
      maxOutputTokens: AI_TOKENS.fullCharacterPhrases,
    }),
  );
  if (!raw.phrases || typeof raw.phrases !== 'object') {
    throw new AiError('Missing phrases in response');
  }
  return parsePhrasesSingles(raw.phrases);
}

async function generateCharacterOutgoingNicknames(
  apiKey: string,
  name: string,
  characters: Character[],
  extra?: string,
): Promise<GeneratedOutgoingNicknames> {
  const chunks: Character[][] = [];
  for (let i = 0; i < characters.length; i += MISSING_NICKNAMES_CHUNK_SIZE) {
    chunks.push(characters.slice(i, i + MISSING_NICKNAMES_CHUNK_SIZE));
  }
  if (chunks.length === 0) {
    chunks.push([]);
  }

  let nicknameDefault = singleToTriplet('');
  const byTargetName: Record<string, Triplet> = {};

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const includeDefaults = i === 0;
    const raw = parseJson<Record<string, unknown>>(
      await callGemini(apiKey, {
        prompt: buildFullCharacterNicknamesPrompt(name, chunk, extra, {
          includeDefaults,
        }),
        maxOutputTokens: AI_TOKENS.fullCharacterNicknames,
      }),
    );
    const part = parseOutgoingSingles(raw, { includeDefaults });
    if (includeDefaults && part.nicknameDefault[0]) {
      nicknameDefault = part.nicknameDefault;
    }
    Object.assign(byTargetName, part.byTargetName);
  }

  return { nicknameDefault, byTargetName };
}

function assertLine(raw: Record<string, unknown>, key: string): string {
  const line = String(raw[key] ?? '').trim();
  if (!line) throw new AiError(`Empty ${key} in response`);
  return line;
}

export async function generateFullCharacter(
  apiKey: string,
  name: string,
  characters: Character[],
  extra?: string,
): Promise<FullCharacterGeneration> {
  const phrases = await generateCharacterPhrases(apiKey, name, extra);

  let outgoing = await generateCharacterOutgoingNicknames(
    apiKey,
    name,
    characters,
    extra,
  );
  if (outgoingHasGenericNicknames(outgoing)) {
    const retry = await generateCharacterOutgoingNicknames(
      apiKey,
      name,
      characters,
      extra,
    );
    if (!outgoingHasGenericNicknames(retry)) {
      outgoing = retry;
    }
  }

  const generation: FullCharacterGeneration = {
    phrases,
    outgoing,
    incoming: { bySpeakerName: {} },
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
