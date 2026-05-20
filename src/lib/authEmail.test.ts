import { describe, expect, it } from 'vitest';
import { formatAccountLabel, validateEmail } from './authEmail';

describe('authEmail', () => {
  it('validates email format', () => {
    expect(validateEmail('bad')).toMatch(/valid/);
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('formats account label as email', () => {
    expect(formatAccountLabel('user@example.com')).toBe('user@example.com');
  });
});
