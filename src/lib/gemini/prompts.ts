import { MAX_SHORT_TEXT_LENGTH } from '../../constants';
import type { Character } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import { getAllNicknamesForSearch, getEffectiveNickname } from '../nicknames';
import { isShortPhraseType } from '../textLimits';

const PHRASE_TYPE_LIST = PHRASE_TYPES.map(
  (t) => `- ${t.key}: "${t.label}"`,
).join('\n');

const ENGLISH_PHRASE_RULES = `- All phrase dialogue must be in English only (Latin script).
- If the character normally speaks another language in canon, translate or localize into natural English that preserves meaning, tone, and famous-line feel — do not output non-English phrase text.`;

const SHORT_TEXT_LIMIT_RULES = `- Hard limit (${MAX_SHORT_TEXT_LENGTH} characters max, count every character): "startingSentence", "endingSentence", and all outgoing nicknames in outgoing.nicknameDefault and outgoing.byTargetName. Abbreviate or localize if needed; never exceed the limit.`;

function samplePhrases(char: Character, limit = 2): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const { key } of PHRASE_TYPES) {
    const list = char.phrases[key as PhraseType].filter(Boolean).slice(0, limit);
    if (list.length) out[key] = list;
  }
  return out;
}

export function buildIslandSnapshot(
  characters: Character[],
  focusId?: string,
): string {
  const others = characters.filter((c) => c.id !== focusId);
  return others
    .slice(0, 12)
    .map((c) => {
      const samples = samplePhrases(c, 2);
      const sampleStr =
        Object.keys(samples).length > 0
          ? JSON.stringify(samples)
          : '(no lines yet)';
      const defaults =
        c.nicknameDefaults.length > 0
          ? c.nicknameDefaults.join(' | ')
          : '(none)';
      return `- ${c.name}: default_addresses="${defaults}"; samples=${sampleStr}`;
    })
    .join('\n');
}

export function buildFullCharacterPrompt(
  newName: string,
  characters: Character[],
): string {
  const island = buildIslandSnapshot(characters);
  const targets = characters.map((c) => c.name).join(', ');

  const hasCast = characters.length > 0;

  return `You are writing spoken dialogue lines for a custom island cast in a life-simulation style game.

NEW CHARACTER: "${newName}"

CANON FIRST (required):
- Base "${newName}" entirely on their source canon — personality, speech patterns, famous lines, and relationships from their original series, game, or work.
- Dialogue and nicknames must sound like THIS character before any island-style humor or game parody.
- Light island flavor is optional seasoning only; never rewrite them into a generic villager voice.

EXISTING CAST (voice reference — match tone when present):
${island || '(empty island — first character)'}

EXISTING NAMES (for nicknames): ${targets || '(none — use empty objects below)'}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Rules:
${ENGLISH_PHRASE_RULES}
${SHORT_TEXT_LIMIT_RULES}
- Each phrase is short (under ~80 chars), spoken aloud, fits a simple dialogue UI.
- "Starting a sentence" = opener fragment; "Ending a sentence" = closer fragment (can start with punctuation).
- "Loud shout" = ALL CAPS energy.
- Provide exactly 3 distinct options per phrase type (triplets).
- nicknameDefault: exactly 3 default nicknames for strangers / new acquaintances (canon-appropriate).
${hasCast
    ? `- byTargetName: for EACH existing cast member listed, 3 nickname options "${newName}" would use (canon-aware).
- incoming.bySpeakerName: for EACH existing cast member, 3 nickname options THEY would use for "${newName}" (canon-aware).`
    : `- byTargetName: use {} (no other islanders yet).
- incoming.bySpeakerName: use {} (no other islanders yet).`}

Return ONLY valid JSON:
{
  "phrases": {
    "catchphrases": ["", "", ""],
    "startingSentence": ["", "", ""],
    "endingSentence": ["", "", ""],
    "beforeEating": ["", "", ""],
    "shoutAtSea": ["", "", ""],
    "whenHappy": ["", "", ""],
    "whenSad": ["", "", ""],
    "whenAngry": ["", "", ""],
    "whileSleeping": ["", "", ""],
    "greeting": ["", "", ""]
  },
  "outgoing": {
    "nicknameDefault": ["", "", ""],
    "byTargetName": { "Existing Name": ["", "", ""] }
  },
  "incoming": {
    "bySpeakerName": { "Existing Name": ["", "", ""] }
  }
}`;
}

function phraseLabel(type: PhraseType): string {
  return PHRASE_TYPES.find((t) => t.key === type)?.label ?? type;
}

export function buildOnePhrasePrompt(
  character: Character,
  allCharacters: Character[],
  type: PhraseType,
): string {
  const existing = character.phrases[type].filter(Boolean);
  return `Write ONE new spoken dialogue line for "${character.name}".

Type: ${phraseLabel(type)} (JSON key: ${type})

Cast tone reference:
${buildIslandSnapshot(allCharacters, character.id)}

EXISTING lines for this type (do NOT duplicate):
${JSON.stringify(existing)}

Rules:
${ENGLISH_PHRASE_RULES}
${isShortPhraseType(type) ? `- Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters for this line (abbreviate if needed).\n` : ''}- Under ~80 chars, spoken aloud, in-character. "shoutAtSea" = ALL CAPS.

Return ONLY valid JSON: { "line": "your new line here" }`;
}

export function buildOneDefaultNicknamePrompt(
  character: Character,
  allCharacters: Character[],
): string {
  const existing = character.nicknameDefaults;
  return `Write ONE default nickname "${character.name}" would use for strangers / new acquaintances.

Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters (abbreviate if needed).

Cast context:
${buildIslandSnapshot(allCharacters, character.id)}

EXISTING defaults (do NOT duplicate):
${JSON.stringify(existing)}

Return ONLY valid JSON: { "nickname": "one nickname" }`;
}

export function buildOneTargetNicknamePrompt(
  character: Character,
  target: Character,
  allCharacters: Character[],
): string {
  const existing = character.nicknames[target.id] ?? [];
  return `Write ONE nickname "${character.name}" would use to address "${target.name}".

Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters (abbreviate if needed).

Cast context:
${buildIslandSnapshot(allCharacters, character.id)}

EXISTING nicknames for ${target.name} (do NOT duplicate):
${JSON.stringify(existing.length ? existing : [getEffectiveNickname(character, target)])}

Return ONLY valid JSON: { "nickname": "one nickname" }`;
}

export function buildOneIncomingNicknamePrompt(
  subject: Character,
  speaker: Character,
  allCharacters: Character[],
): string {
  const existing = speaker.nicknames[subject.id] ?? [];
  return `Write ONE nickname "${speaker.name}" would use to address "${subject.name}" (from ${speaker.name}'s voice).

Cast context:
${buildIslandSnapshot(allCharacters, subject.id)}

EXISTING nicknames ${speaker.name} uses for ${subject.name} (do NOT duplicate):
${JSON.stringify(
    existing.length
      ? existing
      : getAllNicknamesForSearch(speaker, subject).filter(Boolean),
  )}

Return ONLY valid JSON: { "nickname": "one nickname" }`;
}
