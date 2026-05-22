import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import {
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
});
