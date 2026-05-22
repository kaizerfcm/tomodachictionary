import { describe, expect, it } from 'vitest';
import { generateQuickFillCharacter } from './localGeneration';

describe('localGeneration', () => {
  it('quick fill returns triplets for all phrase types', () => {
    const gen = generateQuickFillCharacter('Link', 'Zelda hero', []);
    expect(gen.phrases.greeting).toHaveLength(3);
    expect(gen.outgoing.nicknameDefault).toHaveLength(3);
  });
});
