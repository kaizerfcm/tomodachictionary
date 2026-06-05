import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendAiLog,
  clearAiLogs,
  listAiLogs,
  type AiLogEntry,
} from './aiLogStore';

function sampleEntry(id: string, operation: string): AiLogEntry {
  return {
    id,
    timestamp: Date.now(),
    operation,
    prompt: 'test prompt',
    request: {
      model: 'local-model',
      maxOutputTokens: 256,
      body: { contents: [] },
    },
    durationMs: 42,
    status: 'ok',
    response: { text: '{"ok":true}', finishReason: 'STOP' },
  };
}

describe('aiLogStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('appends and lists logs newest first', () => {
    appendAiLog(sampleEntry('a', 'one-phrase'));
    appendAiLog(sampleEntry('b', 'one-nickname'));
    const logs = listAiLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].id).toBe('b');
    expect(logs[1].id).toBe('a');
  });

  it('clears all logs', () => {
    appendAiLog(sampleEntry('a', 'test'));
    clearAiLogs();
    expect(listAiLogs()).toEqual([]);
  });
});
