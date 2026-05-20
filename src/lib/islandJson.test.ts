import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import { parseIslandJson, serializeIslandJson } from './islandJson';

describe('islandJson', () => {
  it('round-trips island data', () => {
    const data = {
      version: 1 as const,
      characters: [createCharacter('Amy')],
    };
    const parsed = parseIslandJson(serializeIslandJson(data));
    expect(parsed.characters[0].name).toBe('Amy');
    expect(parsed.characters[0].createdAt).toBeGreaterThan(0);
  });

  it('rejects invalid version', () => {
    expect(() => parseIslandJson('{"version":2,"characters":[]}')).toThrow(
      /version/i,
    );
  });
});
