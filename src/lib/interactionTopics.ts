import type { InteractionTopic, InteractionTopicKind } from '../types';

export const INTERACTION_TOPIC_KINDS: {
  value: InteractionTopicKind;
  label: string;
}[] = [
  { value: 'person', label: 'Person' },
  { value: 'thing', label: 'Thing' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Something else' },
];

const VALID_KINDS = new Set<InteractionTopicKind>([
  'person',
  'thing',
  'activity',
  'other',
]);

export function normalizeTopicKind(raw: unknown): InteractionTopicKind {
  if (typeof raw === 'string' && VALID_KINDS.has(raw as InteractionTopicKind)) {
    return raw as InteractionTopicKind;
  }
  return 'other';
}

export function migrateInteractionTopic(raw: unknown): InteractionTopic | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text ? { text, kind: 'other' } : null;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const text =
      typeof obj.text === 'string'
        ? obj.text.trim()
        : typeof obj.topic === 'string'
          ? obj.topic.trim()
          : '';
    if (!text) return null;
    return { text, kind: normalizeTopicKind(obj.kind) };
  }
  return null;
}

export function parseInteractionTopicFromAi(raw: unknown): InteractionTopic | null {
  return migrateInteractionTopic(raw);
}

export function formatTopicPreview(topic: InteractionTopic | undefined): string {
  if (!topic?.text.trim()) return '(empty)';
  const label =
    INTERACTION_TOPIC_KINDS.find((k) => k.value === topic.kind)?.label ??
    topic.kind;
  return `[${label}] ${topic.text}`;
}

export function topicMapFromNameRecord(
  byName: Record<string, unknown>,
  nameToId: Map<string, string>,
): Record<string, InteractionTopic> {
  const out: Record<string, InteractionTopic> = {};
  for (const [name, val] of Object.entries(byName)) {
    const id = nameToId.get(name);
    const topic = parseInteractionTopicFromAi(val);
    if (id && topic) out[id] = topic;
  }
  return out;
}
