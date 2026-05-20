import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import { sortCharacters } from './sortCharacters';

describe('sortCharacters', () => {
  it('sorts by name', () => {
    const a = { ...createCharacter('Zed'), createdAt: 3 };
    const b = { ...createCharacter('Amy'), createdAt: 1 };
    const sorted = sortCharacters([a, b], 'name');
    expect(sorted.map((c) => c.name)).toEqual(['Amy', 'Zed']);
  });

  it('sorts by date added', () => {
    const a = { ...createCharacter('First'), createdAt: 100 };
    const b = { ...createCharacter('Second'), createdAt: 200 };
    const sorted = sortCharacters([b, a], 'dateAdded');
    expect(sorted.map((c) => c.name)).toEqual(['First', 'Second']);
  });
});
