import type { Character, DictionaryData } from '../../types';
import { migrateCharacter } from '../../types';
import { buildIslandRegenerateBatchPrompt } from '../gemini/prompts';
import {
  BATCH_GEMINI_TIMEOUT_MS,
  callGemini,
  type ModelCallOptions,
} from './callModel';
import { AiError } from './errors';
import { parseModelJson } from './parseModelJson';
import { AI_TOKENS } from './tokenLimits';

export type IslandBatchRegenOptions = Pick<ModelCallOptions, 'signal'>;

/** Strip bulky avatar data; keep ids and dialogue fields for the model. */
export function buildIslandRegenPayload(characters: Character[]): DictionaryData {
  return {
    version: 1,
    characters: characters.map(({ avatar: _avatar, ...rest }) => ({
      ...rest,
      avatar: undefined,
    })),
  };
}

function mergeRegeneratedCharacters(
  original: Character[],
  regenerated: Character[],
): Character[] {
  const byId = new Map(regenerated.map((c) => [c.id, c]));
  return original.map((orig) => {
    const next = byId.get(orig.id);
    if (!next) return orig;
    return migrateCharacter({
      ...next,
      avatar: orig.avatar,
      createdAt: orig.createdAt,
    });
  });
}

function parseBatchResponse(
  raw: string,
  finishReason: string | undefined,
  original: Character[],
): Character[] {
  const parsed = parseModelJson<DictionaryData>(raw, { finishReason });
  if (parsed.version !== 1 || !Array.isArray(parsed.characters)) {
    throw new AiError('Batch response must be { "version": 1, "characters": [...] }');
  }
  const regenerated = parsed.characters.map((c) =>
    migrateCharacter(c as Parameters<typeof migrateCharacter>[0]),
  );
  if (regenerated.length !== original.length) {
    throw new AiError(
      `Batch response character count mismatch (expected ${original.length}, got ${regenerated.length})`,
    );
  }
  const origIds = new Set(original.map((c) => c.id));
  for (const c of regenerated) {
    if (!origIds.has(c.id)) {
      throw new AiError(`Batch response contains unknown character id: ${c.id}`);
    }
  }
  return mergeRegeneratedCharacters(original, regenerated);
}

export function islandBatchOutputTokenBudget(characterCount: number): number {
  return Math.min(
    AI_TOKENS.islandBatchMax,
    AI_TOKENS.islandBatchBase + characterCount * AI_TOKENS.islandBatchPerCharacter,
  );
}

export async function generateIslandBatchRegeneration(
  apiKey: string,
  characters: Character[],
  options?: IslandBatchRegenOptions,
): Promise<Character[]> {
  if (characters.length === 0) return [];

  const payload = buildIslandRegenPayload(characters);
  const prompt = buildIslandRegenerateBatchPrompt(payload);
  const maxOutputTokens = islandBatchOutputTokenBudget(characters.length);

  const { text, finishReason } = await callGemini(apiKey, {
    prompt,
    maxOutputTokens,
    signal: options?.signal,
    operation: 'island-batch-regeneration',
    timeoutMs: BATCH_GEMINI_TIMEOUT_MS,
  });

  return parseBatchResponse(text, finishReason, characters);
}
