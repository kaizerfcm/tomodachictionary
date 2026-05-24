import { describe, expect, it } from 'vitest';
import { normalizeTripletInput } from './generate';

describe('normalizeTripletInput', () => {
  it('accepts a plain string', () => {
    expect(normalizeTripletInput('So,')).toEqual(['So,']);
  });

  it('splits pipe-separated strings', () => {
    expect(normalizeTripletInput('So, | Well, | Hey,')).toEqual([
      'So,',
      'Well,',
      'Hey,',
    ]);
  });

  it('accepts short arrays and object-wrapped lines', () => {
    expect(normalizeTripletInput(['So,', 'Well,'])).toEqual(['So,', 'Well,']);
    expect(
      normalizeTripletInput([{ line: 'So,' }, { text: 'Well,' }]),
    ).toEqual(['So,', 'Well,']);
  });

  it('unwraps options arrays', () => {
    expect(
      normalizeTripletInput({ options: ['So,', 'Well,', 'Hey,'] }),
    ).toEqual(['So,', 'Well,', 'Hey,']);
  });

  it('returns empty for nullish values', () => {
    expect(normalizeTripletInput(null)).toEqual([]);
    expect(normalizeTripletInput(undefined)).toEqual([]);
    expect(normalizeTripletInput('   ')).toEqual([]);
  });
});
