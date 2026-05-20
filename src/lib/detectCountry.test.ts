import { describe, expect, it, vi } from 'vitest';
import { detectAccountCountry } from './detectCountry';

describe('detectAccountCountry', () => {
  it('detects Brazil from pt-BR language', () => {
    vi.stubGlobal('navigator', { language: 'pt-BR' });
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({ timeZone: 'Europe/London' }),
      }),
    });
    expect(detectAccountCountry()).toBe('BR');
    vi.unstubAllGlobals();
  });
});
