import { MAX_SHORT_TEXT_LENGTH } from '../../constants';
import type { Character } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import {
  formatCharacterExtraBlock,
  formatCharacterExtraSnapshot,
} from '../characterExtra';
import type { MissingNicknamePairs } from '../missingNicknames';
import { getEffectiveNickname } from '../nicknames';
import { isShortPhraseType } from '../textLimits';

const PHRASE_TYPE_LIST = PHRASE_TYPES.map(
  (t) => `- ${t.key}: "${t.label}"`,
).join('\n');

const ENGLISH_PHRASE_RULES = `- All phrase dialogue must be in English only (Latin script).
- If the character normally speaks another language in canon, translate or localize into natural English that preserves meaning, tone, and famous-line feel — do not output non-English phrase text.`;

const SHORT_TEXT_LIMIT_RULES = `- Hard limit (${MAX_SHORT_TEXT_LENGTH} characters max, count every character): "startingSentence", "endingSentence", and all outgoing nicknames in outgoing.nicknameDefault and outgoing.byTargetName. Abbreviate or localize if needed; never exceed the limit.`;

/** Core instruction: lines must come from source material, not generic villager filler. */
const CANON_DIALOGUE_RULES = `CANON DIALOGUE (required — not generic villager filler):
- Identify the character's source work (game, anime, manga, VN, etc.) from their name and Extra notes.
- Each phrase option should be something they said, a tight paraphrase of a famous line, or unmistakable canon (job, catchphrase, running gag, relationship bit).
- Per phrase type triplet: at least 2 of 3 options must be fan-recognizable from the source (quote, near-quote, or specific reference).
- Use their real speech habits: verbal tics, sarcasm, formality, profanity level, all-caps outbursts, sleepy mumbles, food lines, etc. from canon.
- FORBIDDEN unless the character has no known lines: bland lines any villager could say ("Hey!", "Yay!", "So happy!", "Life is good", "Best day", "You know it!", "For sure!", "Good to see you!").
- If the source is obscure, mine Extra notes; still avoid generic Animal Crossing small-talk.`;

function canonNicknameRules(speakerName: string): string {
  return `CANON NICKNAMES (required):
- Nicknames "${speakerName}" uses must fit how that character addresses people in source canon (honorifics, insults, pet names, surnames only, etc.).
- Relationship-aware when addressing named cast members.`;
}

function samplePhrases(char: Character, limit = 2): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const { key } of PHRASE_TYPES) {
    const list = char.phrases[key as PhraseType].filter(Boolean).slice(0, limit);
    if (list.length) out[key] = list;
  }
  return out;
}

/** Max cast rows in full-character / batch prompts. */
export const ISLAND_SNAPSHOT_LIMIT_FULL = 6;

function buildCompactCastNames(
  characters: Character[],
  focusId?: string,
  max = 4,
): string {
  const others = characters.filter((c) => c.id !== focusId).slice(0, max);
  if (others.length === 0) return '(none)';
  return others.map((c) => c.name).join(', ');
}

function characterIdentityBlock(name: string, extra?: string): string {
  const extraBlock = extra?.trim()
    ? `\nExtra (source / series / role — use this to lock canon):\n${extra.trim()}\n`
    : '\nExtra: (none — infer source work from the character name; if ambiguous, pick the best-known franchise match)\n';
  return `CHARACTER: "${name}"${extraBlock}`;
}

export function buildIslandSnapshot(
  characters: Character[],
  focusId?: string,
  limit = ISLAND_SNAPSHOT_LIMIT_FULL,
): string {
  const others = characters.filter((c) => c.id !== focusId);
  return others
    .slice(0, limit)
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
      return `- ${c.name}: default_addresses="${defaults}"; samples=${sampleStr}${formatCharacterExtraSnapshot(c)}`;
    })
    .join('\n');
}

export function buildFullCharacterPrompt(
  newName: string,
  characters: Character[],
  newExtra?: string,
): string {
  const island = buildIslandSnapshot(characters);
  const targets = characters.map((c) => c.name).join(', ');
  const hasCast = characters.length > 0;

  return `You are a writer quoting and paraphrasing spoken dialogue from a character's ORIGINAL canon for a life-simulation dialogue UI.

${characterIdentityBlock(newName, newExtra)}
${CANON_DIALOGUE_RULES}
${canonNicknameRules(newName)}

Island cast (tone reference only — do not copy their lines for the new character):
${island || '(empty island — first character)'}

Existing names for nicknames: ${targets || '(none — use empty byTargetName)'}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Rules:
${ENGLISH_PHRASE_RULES}
${SHORT_TEXT_LIMIT_RULES}
- Each phrase is short (under ~80 chars), spoken aloud, fits a simple dialogue UI.
- "Starting a sentence" = opener fragment; "Ending a sentence" = closer fragment (can start with punctuation).
- "Loud shout" = ALL CAPS if the character shouts in canon.
- Provide exactly 3 distinct options per phrase type. Each option must draw from different canon moments or lines where possible.
- nicknameDefault: exactly 3 default nicknames strangers would hear in canon (or how the character addresses unknown people).
${hasCast
    ? `- byTargetName: for EACH existing cast member, 3 nicknames "${newName}" would use for them in canon (relationship-specific).`
    : `- byTargetName: use {} (no other islanders yet).`}
- Do NOT generate incoming.bySpeakerName. Always return "incoming": { "bySpeakerName": {} }.

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
  _allCharacters: Character[],
  type: PhraseType,
): string {
  const existing = character.phrases[type].filter(Boolean).slice(0, 5);
  return `Write ONE new spoken dialogue line for a life-simulation UI.

${characterIdentityBlock(character.name, character.extra)}
${formatCharacterExtraBlock(character)}
${CANON_DIALOGUE_RULES}

Phrase category: ${phraseLabel(type)} (JSON key: ${type})
- Choose a line or tight paraphrase this character actually said (or would say) in that situation in canon.

EXISTING lines for this type (do NOT duplicate):
${JSON.stringify(existing)}

Rules:
${ENGLISH_PHRASE_RULES}
${isShortPhraseType(type) ? `- Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters (abbreviate if needed).\n` : ''}- Under ~80 chars, spoken aloud. "shoutAtSea" = ALL CAPS if they shout in canon.

Return ONLY valid JSON: { "line": "your new line here" }`;
}

export function buildOneDefaultNicknamePrompt(
  character: Character,
  allCharacters: Character[],
): string {
  const existing = character.nicknameDefaults.slice(0, 5);
  return `Write ONE default nickname "${character.name}" would use for strangers / new acquaintances in canon.

${characterIdentityBlock(character.name, character.extra)}
${canonNicknameRules(character.name)}
Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters (abbreviate if needed).

Other islanders (names only): ${buildCompactCastNames(allCharacters, character.id)}

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
  return `Write ONE nickname "${character.name}" would use to address "${target.name}" in canon.

${characterIdentityBlock(character.name, character.extra)}
${formatCharacterExtraBlock(target)}
${canonNicknameRules(character.name)}
Hard limit: at most ${MAX_SHORT_TEXT_LENGTH} characters (abbreviate if needed).

Other islanders (names only): ${buildCompactCastNames(allCharacters, character.id)}

EXISTING nicknames for ${target.name} (do NOT duplicate):
${JSON.stringify(existing.length ? existing : [getEffectiveNickname(character, target)])}

Return ONLY valid JSON: { "nickname": "one nickname" }`;
}

export function buildMissingIslandNicknamesPrompt(
  subject: Character,
  allCharacters: Character[],
  missing: MissingNicknamePairs,
): string {
  const outgoingNames = missing.missingOutgoing.map((c) => c.name);
  const incomingNames = missing.missingIncoming.map((c) => c.name);

  return `Write nicknames from source canon for a life-simulation cast.

${characterIdentityBlock(subject.name, subject.extra)}
${canonNicknameRules(subject.name)}

Cast context (compact):
${buildIslandSnapshot(allCharacters, subject.id, ISLAND_SNAPSHOT_LIMIT_FULL)}

Generate exactly ONE nickname per name below. Use the exact islander names as JSON keys.

OUTGOING — nicknames "${subject.name}" would use to address each islander (only these names):
${outgoingNames.length ? outgoingNames.join(', ') : '(none — use {})'}

INCOMING — nicknames each islander would use for "${subject.name}" (only these names):
${incomingNames.length ? incomingNames.join(', ') : '(none — use {})'}

Rules:
- Outgoing nicknames: at most ${MAX_SHORT_TEXT_LENGTH} characters each.
- Incoming nicknames: short and in-character from each speaker's canon.
- English only (Latin script); localize from canon if needed.
- Do not duplicate existing nicknames already on the island.
- Include ONLY keys listed above; omit everyone else.

Return ONLY valid JSON:
{
  "outgoing": { "Islander Name": "nickname" },
  "incoming": { "Islander Name": "nickname" }
}`;
}
