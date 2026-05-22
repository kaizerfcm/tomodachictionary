import { describe, expect, it } from 'vitest';
import {
  generateLocalPhrase,
  generateLocalDefaultNickname,
  generateQuickFillCharacter,
} from './localGeneration';
import { emptyPhrases, type Character } from '../types';

function stubChar(name: string, extra?: string): Character {
  return {
    id: '1',
    name,
    extra,
    phrases: emptyPhrases(),
    nicknameDefaults: [],
    nicknames: {},
    createdAt: 0,
  };
}

describe('localGeneration', () => {
  it('generates a non-empty phrase', () => {
    const c = stubChar('Mario');
    const line = generateLocalPhrase(c, 'greeting');
    expect(line.trim().length).toBeGreaterThan(0);
  });

  it('generates short default nickname', () => {
    const c = stubChar('Isabelle');
    const nick = generateLocalDefaultNickname(c);
    expect(nick.length).toBeLessThanOrEqual(13);
  });

  it('quick fill returns triplets for all phrase types', () => {
    const gen = generateQuickFillCharacter('Link', 'Zelda hero', []);
    expect(gen.phrases.greeting).toHaveLength(3);
    expect(gen.outgoing.nicknameDefault).toHaveLength(3);
  });
});
