import { describe, expect, it } from 'vitest';
import { createCharacter } from '../../types';
import { parseBatchResponse } from './islandBatchRegen';

describe('islandBatchRegen', () => {
  it('applies partial batch updates when response count mismatches', () => {
    const a = createCharacter('Alpha', 'id-a');
    const b = createCharacter('Beta', 'id-b');
    const raw = JSON.stringify({
      version: 1,
      characters: [
        {
          ...a,
          phrases: { ...a.phrases, greeting: ['New hi'] },
          levelUpRewards: {
            goods: ['Guitar'],
            quirks: { walking: 'Walks Cutely' },
          },
        },
      ],
    });

    const result = parseBatchResponse(raw, 'STOP', [a, b]);

    expect(result.updatedIds).toEqual(['id-a']);
    expect(result.missed).toEqual([{ id: 'id-b', name: 'Beta' }]);
    expect(result.warnings.some((w) => w.includes('count mismatch'))).toBe(true);
    expect(result.characters[0].phrases.greeting).toEqual(['New hi']);
    expect(result.characters[1]).toEqual(b);
  });
});
