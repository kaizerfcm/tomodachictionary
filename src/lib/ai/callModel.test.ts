import { describe, expect, it } from 'vitest';
import { buildLlmUrl, extractLmStudioMessageText, resolveLlmHost } from './callModel';

describe('callModel', () => {
  it('uses Vite proxy path in dev', () => {
    expect(buildLlmUrl('127.0.0.1', { useDevProxy: true })).toBe(
      '/llm-api/v1/chat',
    );
  });

  it('uses local CORS proxy in production builds', () => {
    expect(buildLlmUrl('127.0.0.1', { useDevProxy: false })).toBe(
      'http://127.0.0.1:1235/api/v1/chat',
    );
    expect(buildLlmUrl('localhost', { useDevProxy: false })).toBe(
      'http://localhost:1235/api/v1/chat',
    );
  });

  it('resolves configured host for proxy header', () => {
    expect(resolveLlmHost('localhost')).toBe('localhost');
    expect(resolveLlmHost('192.168.1.50')).toBe('192.168.1.50');
  });

  it('extracts message text from LM Studio output array', () => {
    expect(
      extractLmStudioMessageText({
        output: [
          { type: 'message', content: '{"ok":' },
          { type: 'message', content: 'true}' },
        ],
      }),
    ).toBe('{"ok":true}');
  });
});
