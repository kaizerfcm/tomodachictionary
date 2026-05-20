import { describe, expect, it } from 'vitest';
import {
  emailToDisplayUsername,
  normalizeUsername,
  usernameToEmail,
  validateUsername,
} from './authUsername';

describe('authUsername', () => {
  it('normalizes to lowercase alphanumeric underscore', () => {
    expect(normalizeUsername('  Foo_Bar! ')).toBe('foo_bar');
  });

  it('validates length and charset', () => {
    expect(validateUsername('ab')).toMatch(/at least 3/);
    expect(validateUsername('ok_user')).toBeNull();
  });

  it('maps username to synthetic email', () => {
    expect(usernameToEmail('my_user')).toBe(
      'my_user@accounts.tomodachictionary.app',
    );
  });

  it('displays username from synthetic email', () => {
    expect(
      emailToDisplayUsername('my_user@accounts.tomodachictionary.app'),
    ).toBe('my_user');
    expect(emailToDisplayUsername('real@gmail.com')).toBe('real@gmail.com');
  });
});
