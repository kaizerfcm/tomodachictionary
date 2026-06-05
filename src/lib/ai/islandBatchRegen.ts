import type { Character, DictionaryData } from '../../types';
import { migrateCharacter } from '../../types';
import { buildIslandRegenerateBatchPrompt } from './prompts';
import {
  BATCH_LLM_TIMEOUT_MS,
  callLocalLlm,
  type ModelCallOptions,
} from './callModel';
import { AiError } from './errors';
import { parseModelJson } from './parseModelJson';
import { AI_TOKENS } from './tokenLimits';

export type IslandBatchRegenOptions = Pick<ModelCallOptions, 'signal'>;

export type IslandBatchRegenMissed = {
  id: string;
  name: string;
};

export type IslandBatchRegenResult = {
  characters: Character[];
  updatedIds: string[];
  missed: IslandBatchRegenMissed[];
  warnings: string[];
};

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

export function parseBatchResponse(
  raw: string,
  finishReason: string | undefined,
  original: Character[],
): IslandBatchRegenResult {
  const parsed = parseModelJson<DictionaryData>(raw, { finishReason });
  if (parsed.version !== 1 || !Array.isArray(parsed.characters)) {
    throw new AiError('Batch response must be { "version": 1, "characters": [...] }');
  }

  const origById = new Map(original.map((c) => [c.id, c]));
  const warnings: string[] = [];
  const byId = new Map<string, Character>();

  for (const entry of parsed.characters) {
    const migrated = migrateCharacter(
      entry as Parameters<typeof migrateCharacter>[0],
    );
    if (!origById.has(migrated.id)) {
      warnings.push(
        `Ignored unknown character id in batch response: ${migrated.id} (${migrated.name})`,
      );
      continue;
    }
    byId.set(migrated.id, migrated);
  }

  const updatedIds = [...byId.keys()];
  const missed = original
    .filter((c) => !byId.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  if (parsed.characters.length !== original.length) {
    warnings.push(
      `Batch response character count mismatch (expected ${original.length}, got ${parsed.characters.length}) — applied ${updatedIds.length} update(s), kept ${missed.length} original(s)`,
    );
  }

  if (updatedIds.length === 0) {
    throw new AiError(
      'Batch response did not include any matching islanders to apply',
    );
  }

  return {
    characters: mergeRegeneratedCharacters(original, [...byId.values()]),
    updatedIds,
    missed,
    warnings,
  };
}

export function islandBatchOutputTokenBudget(characterCount: number): number {
  return Math.min(
    AI_TOKENS.islandBatchMax,
    AI_TOKENS.islandBatchBase + characterCount * AI_TOKENS.islandBatchPerCharacter,
  );
}

export async function generateIslandBatchRegeneration(
  llmHost: string,
  characters: Character[],
  options?: IslandBatchRegenOptions,
): Promise<IslandBatchRegenResult> {
  if (characters.length === 0) {
    return { characters: [], updatedIds: [], missed: [], warnings: [] };
  }

  const payload = buildIslandRegenPayload(characters);
  const prompt = buildIslandRegenerateBatchPrompt(payload);
  const maxOutputTokens = islandBatchOutputTokenBudget(characters.length);

  const { text, finishReason } = await callLocalLlm(llmHost, {
    prompt,
    maxOutputTokens,
    signal: options?.signal,
    operation: 'island-batch-regeneration',
    timeoutMs: BATCH_LLM_TIMEOUT_MS,
  });

  return parseBatchResponse(text, finishReason, characters);
}
