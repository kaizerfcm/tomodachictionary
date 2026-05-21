import { describe, expect, it, vi } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('returns explicit light and dark', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('follows system preference when set to system', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(resolveTheme('system')).toBe('dark');
    vi.unstubAllGlobals();
  });
});
