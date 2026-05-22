import { PHRASE_TYPES, type PhraseType } from '../../types';
import type { GeneratedMissingNicknames } from '../gemini/types';
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
import { callModel } from './callModel';
import { AiError } from './errors';
import { AI_TOKENS } from './tokenLimits';
import type { AiSettings } from './types';

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  return JSON.parse(jsonStr) as T;
}

function assertTriplet(value: unknown, label: string): Triplet {
  if (!Array.isArray(value) || value.length < 3) {
    throw new AiError(`Invalid triplet for ${label}`);
  }
  return [
    String(value[0] ?? '').trim(),
    String(value[1] ?? '').trim(),
    String(value[2] ?? '').trim(),
  ];
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
  settings: AiSettings,
  prompt: string,
): Promise<FullCharacterGeneration> {
  const raw = parseJson<Record<string, unknown>>(
    await callModel(settings, {
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
  settings: AiSettings,
  prompt: string,
  phraseType?: PhraseType,
): Promise<string> {
  const raw = parseJson<Record<string, unknown>>(
    await callModel(settings, {
      prompt,
      maxOutputTokens: AI_TOKENS.singleLine,
    }),
  );
  const line = assertLine(raw, 'line');
  return phraseType ? clampPhraseForType(phraseType, line) : line;
}

export async function generateOneNickname(
  settings: AiSettings,
  prompt: string,
  clampToShort = false,
): Promise<string> {
  const raw = parseJson<Record<string, unknown>>(
    await callModel(settings, {
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
  settings: AiSettings,
  prompt: string,
): Promise<GeneratedMissingNicknames> {
  const raw = parseJson<Record<string, unknown>>(
    await callModel(settings, {
      prompt,
      maxOutputTokens: AI_TOKENS.missingNicknames,
    }),
  );
  return {
    outgoing: parseNicknameStringMap(raw.outgoing, true),
    incoming: parseNicknameStringMap(raw.incoming, false),
  };
}
