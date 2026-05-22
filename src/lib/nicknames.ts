import { MAX_NICKNAME_OPTIONS } from '../constants';
import type { Character } from '../types';

export function getTargetNicknames(
  speaker: Character,
  targetId: string,
): string[] {
  return speaker.nicknames[targetId] ?? [];
}

export function getAllNicknamesForSearch(
  speaker: Character,
  target: Character,
): string[] {
  const specific = getTargetNicknames(speaker, target.id);
  const defaults = speaker.nicknameDefaults;
  return [...specific, ...defaults, target.name];
}

/** Haystack for “what others call” subject (incoming list). */
export function getIncomingNicknamesForSearch(
  speaker: Character,
  subject: Character,
): string[] {
  const incoming = speaker.nicknames[subject.id] ?? [];
  const subjectCallsSpeaker = subject.nicknames[speaker.id] ?? [];
  return [...incoming, ...subjectCallsSpeaker, speaker.name, subject.name];
}

/** Both directions for one islander pair (filter / search). */
export function getPairNicknamesForSearch(
  subject: Character,
  other: Character,
): string[] {
  return [
    ...getAllNicknamesForSearch(subject, other),
    ...(other.nicknames[subject.id] ?? []),
    other.name,
    subject.name,
  ];
}

export function getEffectiveNickname(
  speaker: Character,
  target: Character,
): string {
  const list = getTargetNicknames(speaker, target.id);
  if (list.length) return list[0];
  if (speaker.nicknameDefaults.length) return speaker.nicknameDefaults[0];
  return target.name;
}

export function canAddNicknameOption(currentCount: number): boolean {
  return currentCount < MAX_NICKNAME_OPTIONS;
}

export function dedupeNicknames(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, MAX_NICKNAME_OPTIONS);
}
