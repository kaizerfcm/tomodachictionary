import { describe, expect, it } from 'vitest';
import {
  buildRegeneratedCharacterContent,
  defaultRegenerateChoices,
  formatDialoguePreview,
  tripletToLines,
} from './characterRegeneration';
import type { FullCharacterGeneration } from './gemini/types';
import { createCharacter, PHRASE_TYPES } from '../types';

function emptyGeneration(): FullCharacterGeneration {
  const phrases = Object.fromEntries(
    PHRASE_TYPES.map(({ key }) => [key, ['', '', ''] as const]),
  ) as FullCharacterGeneration['phrases'];
  return {
    phrases,
    outgoing: { nicknameDefault: ['', '', ''], byTargetName: {} },
    incoming: { bySpeakerName: {} },
  };
}

describe('characterRegeneration', () => {
  it('formats dialogue preview', () => {
    expect(formatDialoguePreview(['Hey!', 'Yo'])).toBe('Hey! · Yo');
    expect(formatDialoguePreview([])).toBe('(empty)');
  });

  it('applies only sections marked new', () => {
    const subject = createCharacter('Futaba', 'sub-1', 'Persona 5');
    subject.phrases.greeting = ['Old hi'];
    subject.nicknameDefaults = ['Old default'];

    const target = createCharacter('Ren', 'sub-2');
    subject.nicknames[target.id] = ['Old nick'];

    const generation = emptyGeneration();
    generation.phrases.greeting = ['New hi', '', ''];
    generation.outgoing.nicknameDefault = ['New default', '', ''];
    generation.outgoing.byTargetName[target.name] = ['New nick', '', ''];

    const choices = defaultRegenerateChoices(subject, [subject, target], generation);
    choices.phrases.greeting = 'new';
    choices.outgoingByTargetId[target.id] = 'new';

    const patch = buildRegeneratedCharacterContent(
      subject,
      generation,
      [subject, target],
      choices,
    );

    expect(patch.phrases.greeting).toEqual(['New hi']);
    expect(patch.nicknameDefaults).toEqual(['Old default']);
    expect(patch.nicknames[target.id]).toEqual(['New nick']);
  });

  it('extracts non-empty triplet lines', () => {
    expect(tripletToLines(['A', '', 'B'])).toEqual(['A', 'B']);
  });
});
