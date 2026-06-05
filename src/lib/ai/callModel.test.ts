import { describe, expect, it } from 'vitest';
import { buildLlmUrl, extractLmStudioMessageText } from './callModel';

describe('callModel', () => {
  it('builds LM Studio native chat URL', () => {
    expect(buildLlmUrl('127.0.0.1')).toBe(
      'http://127.0.0.1:1234/api/v1/chat',
    );
    expect(buildLlmUrl('localhost')).toBe(
      'http://localhost:1234/api/v1/chat',
    );
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
