import { PHRASE_TYPES, type PhraseType } from '../../types';
import {
  applyShortTextLimitsToGeneration,
  clampOutgoingNickname,
  clampPhraseForType,
} from '../textLimits';
import type {
  FullCharacterGeneration,
  GeneratedPhrases,
  Triplet,
} from './types';

/** Cheapest stable text model on Google AI Studio (see ai.google.dev/gemini-api/docs/models). */
const MODEL = 'gemini-2.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let message = `Gemini API error (${res.status})`;
    try {
      const parsed = JSON.parse(errBody) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (errBody) message = errBody.slice(0, 200);
    }
    throw new GeminiError(message);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError('Empty response from Gemini');
  return text;
}

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  return JSON.parse(jsonStr) as T;
}

function assertTriplet(value: unknown, label: string): Triplet {
  if (!Array.isArray(value) || value.length < 3) {
    throw new GeminiError(`Invalid triplet for ${label}`);
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
  if (!line) throw new GeminiError(`Empty ${key} in response`);
  return line;
}

export async function generateFullCharacter(
  apiKey: string,
  prompt: string,
): Promise<FullCharacterGeneration> {
  const raw = parseJson<Record<string, unknown>>(await callGemini(apiKey, prompt));
  const phrasesRaw = raw.phrases as Record<string, unknown>;
  const outgoingRaw = raw.outgoing as Record<string, unknown>;
  const incomingRaw = (raw.incoming as Record<string, unknown>) ?? {};

  if (!phrasesRaw || !outgoingRaw) {
    throw new GeminiError('Missing phrases or outgoing in response');
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
  const raw = parseJson<Record<string, unknown>>(await callGemini(apiKey, prompt));
  const line = assertLine(raw, 'line');
  return phraseType ? clampPhraseForType(phraseType, line) : line;
}

export async function generateOneNickname(
  apiKey: string,
  prompt: string,
  clampToShort = false,
): Promise<string> {
  const raw = parseJson<Record<string, unknown>>(await callGemini(apiKey, prompt));
  const nick = assertLine(raw, 'nickname');
  return clampToShort ? clampOutgoingNickname(nick) : nick;
}
