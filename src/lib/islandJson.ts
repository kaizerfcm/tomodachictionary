import { backfillCreatedAt } from './characterDates';
import type { DictionaryData } from '../types';
import { migrateCharacter } from '../types';

export function serializeIslandJson(data: DictionaryData): string {
  return JSON.stringify(data, null, 2);
}

export function parseIslandJson(text: string): DictionaryData {
  const raw = JSON.parse(text) as unknown;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON: expected an object.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error('Unsupported format version (expected version: 1).');
  }
  if (!Array.isArray(obj.characters)) {
    throw new Error('Invalid JSON: missing characters array.');
  }
  const characters = backfillCreatedAt(
    obj.characters.map((c) => migrateCharacter(c as Parameters<typeof migrateCharacter>[0])),
  );
  return { version: 1, characters };
}

export function downloadIslandJson(data: DictionaryData, filename?: string): void {
  const blob = new Blob([serializeIslandJson(data)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ??
    `tomodachi-island-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
