import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import {
  chunkMissingNicknamePairs,
  countMissingNicknamePairs,
  getMissingNicknamePairs,
} from './missingNicknames';

describe('missingNicknames', () => {
  it('lists islanders missing either direction', () => {
    const a = createCharacter('A');
    const b = createCharacter('B');
    const c = createCharacter('C');
    a.nicknames[b.id] = ['buddy'];
    c.nicknames[a.id] = ['chief'];

    const missing = getMissingNicknamePairs(a, [a, b, c]);
    expect(missing.missingOutgoing.map((x) => x.name)).toEqual(['C']);
    expect(missing.missingIncoming.map((x) => x.name)).toEqual(['B']);
    expect(countMissingNicknamePairs(missing)).toBe(2);
  });

  it('chunks large missing lists for batched API calls', () => {
    const subject = createCharacter('Hero');
    const others = Array.from({ length: 25 }, (_, i) =>
      createCharacter(`Islander ${i}`),
    );
    const missing = getMissingNicknamePairs(subject, [subject, ...others]);
    const chunks = chunkMissingNicknamePairs(missing, 12);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.missingOutgoing.length).toBeLessThanOrEqual(12);
      expect(chunk.missingIncoming.length).toBeLessThanOrEqual(12);
    }
  });
});
