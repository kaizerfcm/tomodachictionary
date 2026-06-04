import { MISSING_NICKNAMES_CHUNK_SIZE } from '../../constants';
import type { Character, InteractionTopic, LevelUpRewards } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import {
  buildFullCharacterNicknamesPrompt,
  buildFullCharacterPhrasesPrompt,
  buildMissingIslandNicknamesPrompt,
  buildLevelUpRewardsPrompt,
  buildInteractionTopicPrompt,
  buildMissingInteractionTopicsPrompt,
} from '../gemini/prompts';
import type { GeneratedMissingNicknames } from '../gemini/types';
import {
  chunkMissingNicknamePairs,
  type MissingNicknamePairs,
} from '../missingNicknames';
import { parseGeneratedLevelUpRewards } from '../livingTheDreamGifts';
import { parseInteractionTopicFromAi } from '../interactionTopics';
import {
  clampOutgoingNickname,
  clampPhraseForType,
  applyShortTextLimitsToGeneration,
} from '../textLimits';
import type {
  FullCharacterGeneration,
  GeneratedOutgoingNicknames,
  GeneratedPhrases,
  Triplet,
} from '../gemini/types';
import { callGemini, type ModelCallOptions } from './callModel';
import { AiError } from './errors';
import { parseModelJson } from './parseModelJson';
import { AI_TOKENS } from './tokenLimits';

export type GenerateCallOptions = Pick<ModelCallOptions, 'signal'>;

const GENERIC_NICKNAME =
  /^(pal|buddy|friend|man|dude|bro|chief|sport|kid|mate|homie|hey|you)$/i;

function isGenericNickname(value: string): boolean {
  return GENERIC_NICKNAME.test(value.trim());
}

function parseLevelUpRewards(
  raw: Record<string, unknown> | undefined,
): LevelUpRewards {
  return parseGeneratedLevelUpRewards(raw);
}

function parseInteractionTopicsRecord(
  raw: Record<string, unknown> | undefined,
): Record<string, InteractionTopic> {
  const out: Record<string, InteractionTopic> = {};
  if (!raw) return out;
  for (const [name, val] of Object.entries(raw)) {
    const topic = parseInteractionTopicFromAi(val);
    if (topic) out[name] = topic;
  }
  return out;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AiError('Generation cancelled');
}

async function callGeminiJson<T>(
  apiKey: string,
  options: ModelCallOptions,
): Promise<T> {
  const { text, finishReason } = await callGemini(apiKey, options);
  return parseModelJson<T>(text, { finishReason });
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

function arrayToTriplet(lines: string[]): Triplet {
  return [
    lines[0] || '',
    lines[1] || '',
    lines[2] || '',
  ];
}

function parsePhrasesBatch(raw: Record<string, unknown>): GeneratedPhrases {
  const phrases = {} as GeneratedPhrases;
  for (const { key } of PHRASE_TYPES) {
    const type = key as PhraseType;
    const items = normalizeTripletInput(raw[key]);
    if (items.length === 0) throw new AiError(`Empty array for ${key}`);
    phrases[type] = arrayToTriplet(items.map(line => clampPhraseForType(type, line)));
  }
  return phrases;
}

function parseOutgoingBatch(
  raw: Record<string, unknown>,
  options?: { includeDefaults?: boolean },
): GeneratedOutgoingNicknames {
  const includeDefaults = options?.includeDefaults ?? true;
  const byTargetRaw = raw.byTargetName as Record<string, unknown> | undefined;
  const byTargetName: Record<string, Triplet> = {};

  for (const [name, val] of Object.entries(byTargetRaw ?? {})) {
    const items = normalizeTripletInput(val);
    byTargetName[name] = arrayToTriplet(items.map(line => clampOutgoingNickname(line)));
  }

  let nicknameDefault: Triplet = ['', '', ''];
  if (includeDefaults) {
    const items = normalizeTripletInput(raw.nicknameDefault);
    nicknameDefault = arrayToTriplet(items.map(line => clampOutgoingNickname(line)));
  }

  return {
    nicknameDefault,
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
  options?: GenerateCallOptions,
): Promise<{ phrases: GeneratedPhrases; levelUpRewards: LevelUpRewards }> {
  throwIfAborted(options?.signal);
  const raw = await callGeminiJson<{
    phrases: Record<string, unknown>;
    levelUpRewards?: Record<string, unknown>;
  }>(apiKey, {
    prompt: buildFullCharacterPhrasesPrompt(name, extra),
    maxOutputTokens: AI_TOKENS.fullCharacterPhrases,
    signal: options?.signal,
    operation: 'full-character-phrases',
  });
  if (!raw.phrases || typeof raw.phrases !== 'object') {
    throw new AiError('Missing phrases in response');
  }
  const phrases = parsePhrasesBatch(raw.phrases);

  const levelUpRewards = parseLevelUpRewards(raw.levelUpRewards);

  return { phrases, levelUpRewards };
}

async function generateCharacterOutgoingNicknames(
  apiKey: string,
  name: string,
  characters: Character[],
  extra?: string,
  options?: GenerateCallOptions,
): Promise<{
  outgoing: GeneratedOutgoingNicknames;
  interactionTopics: Record<string, InteractionTopic>;
}> {
  const chunks: Character[][] = [];
  for (let i = 0; i < characters.length; i += MISSING_NICKNAMES_CHUNK_SIZE) {
    chunks.push(characters.slice(i, i + MISSING_NICKNAMES_CHUNK_SIZE));
  }
  if (chunks.length === 0) {
    chunks.push([]);
  }

  let nicknameDefault = arrayToTriplet([]);
  const byTargetName: Record<string, Triplet> = {};
  const interactionTopics: Record<string, InteractionTopic> = {};

  for (let i = 0; i < chunks.length; i += 1) {
    throwIfAborted(options?.signal);
    const chunk = chunks[i];
    const includeDefaults = i === 0;
    const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
      prompt: buildFullCharacterNicknamesPrompt(name, chunk, extra, {
        includeDefaults,
      }),
      maxOutputTokens: AI_TOKENS.fullCharacterNicknames,
      signal: options?.signal,
      operation: 'full-character-nicknames',
    });
    const part = parseOutgoingBatch(raw, { includeDefaults });
    if (includeDefaults && part.nicknameDefault[0]) {
      nicknameDefault = part.nicknameDefault;
    }
    Object.assign(byTargetName, part.byTargetName);

    const topicsRaw = raw.interactionTopics;
    Object.assign(
      interactionTopics,
      parseInteractionTopicsRecord(
        topicsRaw && typeof topicsRaw === 'object'
          ? (topicsRaw as Record<string, unknown>)
          : undefined,
      ),
    );
  }

  return { outgoing: { nicknameDefault, byTargetName }, interactionTopics };
}

export async function generateFullCharacter(
  apiKey: string,
  name: string,
  characters: Character[],
  extra?: string,
  options?: GenerateCallOptions,
): Promise<FullCharacterGeneration> {
  const phrasesResult = await generateCharacterPhrases(
    apiKey,
    name,
    extra,
    options,
  );

  let nicknamesResult = await generateCharacterOutgoingNicknames(
    apiKey,
    name,
    characters,
    extra,
    options,
  );
  if (outgoingHasGenericNicknames(nicknamesResult.outgoing)) {
    throwIfAborted(options?.signal);
    const retry = await generateCharacterOutgoingNicknames(
      apiKey,
      name,
      characters,
      extra,
      options,
    );
    if (!outgoingHasGenericNicknames(retry.outgoing)) {
      nicknamesResult = retry;
    }
  }

  const generation: FullCharacterGeneration = {
    phrases: phrasesResult.phrases,
    levelUpRewards: phrasesResult.levelUpRewards,
    outgoing: nicknamesResult.outgoing,
    interactionTopics: nicknamesResult.interactionTopics,
    incoming: { bySpeakerName: {} },
  };
  return applyShortTextLimitsToGeneration(generation);
}

export async function generateAllCharacterPhrases(
  apiKey: string,
  name: string,
  extra?: string,
  options?: GenerateCallOptions,
): Promise<GeneratedPhrases> {
  const { phrases } = await generateCharacterPhrases(
    apiKey,
    name,
    extra,
    options,
  );
  return applyShortTextLimitsToGeneration({
    phrases,
    levelUpRewards: {
      song: '',
      interior: '',
      clothing: '',
      hat: '',
      goods: '',
      quirks: '',
    },
    outgoing: { nicknameDefault: ['', '', ''], byTargetName: {} },
    interactionTopics: {},
    incoming: { bySpeakerName: {} },
  }).phrases;
}

export async function generateAllCharacterNicknames(
  apiKey: string,
  name: string,
  characters: Character[],
  extra?: string,
  options?: GenerateCallOptions,
): Promise<GeneratedOutgoingNicknames> {
  let result = await generateCharacterOutgoingNicknames(
    apiKey,
    name,
    characters,
    extra,
    options,
  );
  if (outgoingHasGenericNicknames(result.outgoing)) {
    throwIfAborted(options?.signal);
    const retry = await generateCharacterOutgoingNicknames(
      apiKey,
      name,
      characters,
      extra,
      options,
    );
    if (!outgoingHasGenericNicknames(retry.outgoing)) {
      result = retry;
    }
  }
  return result.outgoing;
}

export function extractFirstLine(
  raw: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const val = raw[key];
    if (val == null) continue;
    const items = normalizeTripletInput(val);
    if (items[0]?.trim()) return items[0].trim();
  }
  for (const val of Object.values(raw)) {
    const items = normalizeTripletInput(val);
    if (items[0]?.trim()) return items[0].trim();
  }
  return '';
}

export async function generateOnePhrase(
  apiKey: string,
  prompt: string,
  phraseType?: PhraseType,
): Promise<string> {
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.singleLine,
    operation: 'one-phrase',
  });

  const keys = [
    'line',
    ...(phraseType ? [phraseType] : []),
    'text',
    'phrase',
    'value',
    'dialogue',
    'content',
  ];
  const line = raw && typeof raw === 'object' ? extractFirstLine(raw, keys) : '';
  if (!line) throw new AiError('Empty line in response');
  return phraseType ? clampPhraseForType(phraseType, line) : line;
}

export async function generateOneNickname(
  apiKey: string,
  prompt: string,
  clampToShort = false,
): Promise<string> {
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.singleLine,
    operation: 'one-nickname',
  });

  const keys = ['nickname', 'line', 'text', 'value', 'name', 'nick'];
  const nick =
    raw && typeof raw === 'object' ? extractFirstLine(raw, keys) : '';
  if (!nick) throw new AiError('Empty nickname in response');
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
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.missingNicknames,
    operation: 'missing-island-nicknames',
  });
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

export async function generateLevelUpRewards(
  apiKey: string,
  character: Character,
): Promise<LevelUpRewards> {
  const prompt = buildLevelUpRewardsPrompt(character);
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.gifts,
    operation: 'level-up-rewards',
  });
  return parseLevelUpRewards(raw);
}

export async function generateInteractionTopic(
  apiKey: string,
  subject: Character,
  target: Character,
): Promise<InteractionTopic> {
  const prompt = buildInteractionTopicPrompt(subject, target);
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.singleLine,
    operation: 'interaction-topic',
  });
  const topic = parseInteractionTopicFromAi(raw);
  if (!topic?.text) throw new AiError('Empty topic in response');
  return topic;
}

export async function generateMissingInteractionTopics(
  apiKey: string,
  subject: Character,
  targets: Character[],
): Promise<Record<string, InteractionTopic>> {
  if (targets.length === 0) return {};
  const prompt = buildMissingInteractionTopicsPrompt(subject, targets);
  const raw = await callGeminiJson<Record<string, unknown>>(apiKey, {
    prompt,
    maxOutputTokens: AI_TOKENS.missingNicknames,
    operation: 'missing-interaction-topics',
  });
  const src =
    raw.topics && typeof raw.topics === 'object'
      ? (raw.topics as Record<string, unknown>)
      : raw;
  return parseInteractionTopicsRecord(
    src && typeof src === 'object' ? src : undefined,
  );
}
