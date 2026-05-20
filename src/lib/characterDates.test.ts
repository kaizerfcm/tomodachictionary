import { describe, expect, it } from 'vitest';
import { createCharacter } from '../types';
import { backfillCreatedAt } from './characterDates';

describe('backfillCreatedAt', () => {
  it('assigns staggered timestamps when missing', () => {
    const a = { ...createCharacter('A'), createdAt: 0 };
    const b = { ...createCharacter('B'), createdAt: 0 };
    const out = backfillCreatedAt([a, b]);
    expect(out[0].createdAt).toBeLessThan(out[1].createdAt);
  });

  it('preserves existing createdAt', () => {
    const c = { ...createCharacter('X'), createdAt: 999 };
    expect(backfillCreatedAt([c])[0].createdAt).toBe(999);
  });
});
