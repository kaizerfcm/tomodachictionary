import { describe, expect, it } from 'vitest';
import {
  extractJsonString,
  parseModelJson,
  repairTruncatedJson,
} from './parseModelJson';

describe('parseModelJson', () => {
  it('extracts JSON from fenced blocks', () => {
    expect(extractJsonString('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('repairs truncated object JSON', () => {
    const broken = '{"characters":[{"id":"1","name":"A","phrases":{"greeting":["Hi"';
    const repaired = repairTruncatedJson(broken);
    expect(() => JSON.parse(repaired)).not.toThrow();
  });

  it('parses with finishReason MAX_TOKENS repair path', () => {
    const partial =
      '{"version":1,"characters":[{"id":"x","name":"Test","phrases":{"greeting":["Hey!"';
    const parsed = parseModelJson<{ version: number }>(partial, {
      finishReason: 'MAX_TOKENS',
    });
    expect(parsed.version).toBe(1);
  });
});
