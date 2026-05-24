import { AI_INITIAL_BATCH_SIZE, MAX_PHRASE_LENGTH, MAX_SHORT_TEXT_LENGTH } from '../../constants';
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

const PHRASE_LENGTH_RULES = `PHRASE LENGTH (hard limits — count EVERY character including spaces and punctuation):
- catchphrases, beforeEating, shoutAtSea, whenHappy, whenSad, whenAngry, whileSleeping, greeting: max ${MAX_PHRASE_LENGTH} characters each. Prefer 8–20.
- startingSentence, endingSentence: max ${MAX_SHORT_TEXT_LENGTH} characters each (tiny UI fragments — often 1–3 words, e.g. "So," or "...yeah").
- If a famous canon line is longer, abbreviate to the most recognizable short form. NEVER exceed the limit.
- shoutAtSea: ALL CAPS when canon demands it; still ≤ ${MAX_PHRASE_LENGTH} characters.`;

const SHORT_TEXT_LIMIT_RULES = `- Hard limit (${MAX_SHORT_TEXT_LENGTH} characters max): all outgoing nicknames in nicknameDefault and byTargetName. Abbreviate if needed.`;

const CANON_MOMENTS_RULES = `ICONIC MOMENTS (required — generic personality blurbs = failure):
- Mine trailers, reveal cinematics, music videos, cutscenes, promotional clips, memes, and fan-quoted scenes tied to THIS character.
- Across the full phrase set, at least half of all options must nod to a specific famous moment fans would recognize (e.g. a MV reveal, trailer catchphrase, signature visual gag, boss-line, viral clip).
- Video-game characters: pull from in-game voice lines and marketing material — not polite small talk.`;

const EXPLICIT_LANGUAGE_RULES = `LANGUAGE & TONE (match the source — no censorship):
- This dictionary mirrors in-game dialogue slots; there is no content filter.
- Reproduce canon profanity, crude jokes, sexual innuendo, and swearing when the character uses them (e.g. nu-metal frontmen, gritty anti-heroes).
- Do not sanitize, bowdlerize, or replace swears with mild euphemisms unless the canon line is mild.`;

/** Core instruction: lines must come from source material, not generic villager filler. */
const CANON_DIALOGUE_RULES = `CANON DIALOGUE (required — wrong character or generic filler = failure):
- Lock onto ONE character: the named CHARACTER and their source work (game, anime, manga, VN, etc.) from name + Extra. Do not write lines for a different character with a similar name.
- Each phrase must be a quote, tight paraphrase, or unmistakable reference to THAT character's canon (catchphrase, job, running gag, relationship, famous scene).
- Match their speech habits: tics, sarcasm, formality, profanity level, sleepy mumbles, food lines, etc.
- FORBIDDEN: bland villager filler ("Hey!", "Yay!", "So happy!", "Life is good", "Best day", "You know it!", "Good to see you!") and lines that could belong to any random islander.
- Do not add trailing periods or commas unless that punctuation is part of a famous canon line.
- If the source is obscure, use Extra notes (series/game name is critical); never invent an unrelated franchise or OC voice.`;

const JSON_SINGLE_LINE_RULES = `- Each phrase type value MUST be one JSON string (not an array).
- startingSentence / endingSentence: tiny opener/closer fragments only from canon.`;

function phraseLengthRuleForType(type: PhraseType): string {
  if (isShortPhraseType(type)) {
    return `max ${MAX_SHORT_TEXT_LENGTH} characters (fragment)`;
  }
  return `max ${MAX_PHRASE_LENGTH} characters`;
}

function canonNicknameRules(speakerName: string): string {
  return `CANON NICKNAMES (required):
- Nicknames "${speakerName}" uses must fit how that character addresses people in source canon (honorifics, insults, pet names, surnames only, etc.).
- Relationship-aware when addressing named cast members — use each target's source/role from the cast list.
- FORBIDDEN generic filler nicknames unless that exact word is canon for this character: Pal, Buddy, Friend, Man, Dude, Bro, Chief, Sport, Kid, Hey, Mate, Homie.
- Each target nickname must differ from nicknameDefault and reflect that specific relationship.`;
}

function samplePhrases(char: Character, limit = 2): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const { key } of PHRASE_TYPES) {
    const list = char.phrases[key as PhraseType].filter(Boolean).slice(0, limit);
    if (list.length) out[key] = list;
  }
  return out;
}

/** Max cast rows in batch nickname prompts. */
export const ISLAND_SNAPSHOT_LIMIT_FULL = 12;

function buildCastListForNicknames(characters: Character[]): string {
  if (characters.length === 0) return '(none — use empty byTargetName)';
  return characters
    .map((c) => {
      const extra = c.extra?.trim();
      return extra ? `- ${c.name} — ${extra}` : `- ${c.name}`;
    })
    .join('\n');
}

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
    : '\nExtra: (none — infer source work from the character name; if ambiguous, pick the best-known franchise match; still mine iconic trailers/MVs/memes for that character)\n';
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

export function buildFullCharacterPhrasesPrompt(
  newName: string,
  newExtra?: string,
): string {
  return `You are quoting spoken dialogue from ONE character's ORIGINAL canon for a life-simulation dialogue UI with strict length slots.

${characterIdentityBlock(newName, newExtra)}
${CANON_DIALOGUE_RULES}
${CANON_MOMENTS_RULES}
${EXPLICIT_LANGUAGE_RULES}
${PHRASE_LENGTH_RULES}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Rules:
${ENGLISH_PHRASE_RULES}
${EXPLICIT_LANGUAGE_RULES}
${JSON_SINGLE_LINE_RULES}
- Provide exactly ${AI_INITIAL_BATCH_SIZE} best canon line per phrase type — prioritize the most fan-recognizable option for that category.
- "Starting a sentence" = opener fragment; "Ending a sentence" = closer fragment (may start with punctuation).
- Self-check each string length before output; truncate if needed.
- This request is standalone — ignore any prior conversation; focus only on "${newName}".

Return ONLY valid JSON:
{
  "phrases": {
    "catchphrases": "",
    "startingSentence": "",
    "endingSentence": "",
    "beforeEating": "",
    "shoutAtSea": "",
    "whenHappy": "",
    "whenSad": "",
    "whenAngry": "",
    "whileSleeping": "",
    "greeting": ""
  }
}`;
}

export function buildFullCharacterNicknamesPrompt(
  newName: string,
  targets: Character[],
  newExtra?: string,
  options?: { includeDefaults?: boolean },
): string {
  const includeDefaults = options?.includeDefaults ?? true;
  const cast = buildCastListForNicknames(targets);
  const hasCast = targets.length > 0;

  return `Write outgoing nicknames from ONE character's source canon for a life-simulation cast.

${characterIdentityBlock(newName, newExtra)}
${canonNicknameRules(newName)}

Island cast (names + source notes only — do NOT reuse generic nicknames from other islanders):
${cast}

Rules:
${SHORT_TEXT_LIMIT_RULES}
- Provide exactly ${AI_INITIAL_BATCH_SIZE} nickname string per field (not arrays).
${includeDefaults ? `- nicknameDefault: one default nickname "${newName}" uses for strangers / new acquaintances.` : '- Do NOT include nicknameDefault in the JSON.'}
${hasCast
    ? `- byTargetName: for EACH cast member listed above, one nickname "${newName}" would use (relationship-specific, from canon).`
    : `- byTargetName: use {} (no other islanders yet).`}
- This request is standalone — ignore any prior conversation; focus only on "${newName}".

Return ONLY valid JSON:
{
  ${includeDefaults ? '"nicknameDefault": "",' : ''}
  "byTargetName": { "Cast Member Name": "" }
}`;
}

/** @deprecated Use buildFullCharacterPhrasesPrompt + buildFullCharacterNicknamesPrompt */
export function buildFullCharacterPrompt(
  newName: string,
  _characters: Character[],
  newExtra?: string,
): string {
  return buildFullCharacterPhrasesPrompt(newName, newExtra);
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
  const limit = phraseLengthRuleForType(type);
  return `Write ONE new spoken dialogue line for a life-simulation UI.

${characterIdentityBlock(character.name, character.extra)}
${formatCharacterExtraBlock(character)}
${CANON_DIALOGUE_RULES}
${CANON_MOMENTS_RULES}
${EXPLICIT_LANGUAGE_RULES}
${PHRASE_LENGTH_RULES}

Phrase category: ${phraseLabel(type)} (JSON key: ${type})
- Hard limit for this line: ${limit}.
- Must be canon for "${character.name}" only — quote, paraphrase, or specific reference from their source.

EXISTING lines for this type (do NOT duplicate):
${JSON.stringify(existing)}

Rules:
${ENGLISH_PHRASE_RULES}
${type === 'shoutAtSea' ? '- ALL CAPS if they shout in canon; still within character limit.\n' : ''}- Count characters before answering; shorten if over limit.
- This request is standalone — ignore any prior conversation; focus only on "${character.name}".

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
  options?: { compactCast?: boolean },
): string {
  const outgoingNames = missing.missingOutgoing.map((c) => c.name);
  const incomingNames = missing.missingIncoming.map((c) => c.name);
  const compact = options?.compactCast ?? false;
  const castContext = compact
    ? `Island cast (names + source notes only):\n${buildCastListForNicknames(
        allCharacters.filter((c) => c.id !== subject.id),
      )}`
    : `Cast context:\n${buildIslandSnapshot(allCharacters, subject.id, ISLAND_SNAPSHOT_LIMIT_FULL)}`;

  return `Write nicknames from source canon for a life-simulation cast.

${characterIdentityBlock(subject.name, subject.extra)}
${canonNicknameRules(subject.name)}

${castContext}

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
