import { AI_INITIAL_BATCH_SIZE, MAX_PHRASE_LENGTH, MAX_SHORT_TEXT_LENGTH } from '../../constants';
import type { Character, DictionaryData } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import {
  formatCharacterExtraBlock,
  formatCharacterExtraSnapshot,
} from '../characterExtra';
import type { MissingNicknamePairs } from '../missingNicknames';
import { getEffectiveNickname } from '../nicknames';
import { isShortPhraseType } from '../textLimits';
import { formatGiftCatalogForPrompt } from '../livingTheDreamGifts';
import { serializeIslandJsonCompact } from '../islandJson';

const PHRASE_TYPE_LIST = PHRASE_TYPES.map(
  (t) => `- ${t.key}: "${t.label}"`,
).join('\n');

const TOMODACHI_LINGO_RULES = `TOMODACHI LIFE OUTPUT (player-visible text):
- Target game: Tomodachi Life: Living the Dream dialogue slots — short, spoken, fun lines.
- Write in ENGLISH for phrases, nicknames, topics, and reward text.
- Exception: at most ONE iconic catchphrase in its original language if universally recognized (short verbal tic only) across the entire phrase set.
- NEVER output copyrighted/trademark names, franchise titles, or other characters from the source work in dialogue or suggestions.
- NEVER reference castmates from the character's franchise — lines must work on a generic Tomodachi island talking to random islanders.
- Do not browse the web, fetch URLs, or use URL context. Ignore any http/https links in input (including localhost).`;

const NO_URL_RULES = `URL / WEB (required):
- Do NOT browse the web or fetch URLs.
- Ignore any http/https links in the input (including localhost).
- Do not mention browsing failures or unsupported sites in output.`;

const PHRASE_LENGTH_RULES = `PHRASE LENGTH (hard limits — count EVERY character including spaces and punctuation):
- catchphrases, beforeEating, shoutAtSea, whenHappy, whenSad, whenAngry, whileSleeping, greeting: max ${MAX_PHRASE_LENGTH} characters each. Prefer 8–20.
- startingSentence, endingSentence: max ${MAX_SHORT_TEXT_LENGTH} characters each (tiny UI fragments — often 1–3 words, e.g. "So," or "...yeah").
- If a famous canon line is longer, abbreviate to the most recognizable short form. NEVER exceed the limit.
- shoutAtSea: ALL CAPS when canon demands it; still ≤ ${MAX_PHRASE_LENGTH} characters.`;

const SHORT_TEXT_LIMIT_RULES = `- Hard limit (${MAX_SHORT_TEXT_LENGTH} characters max): all outgoing nicknames in nicknameDefault and byTargetName. Abbreviate if needed.`;

const CANON_MOMENTS_RULES = `ICONIC VOICE (required — generic personality blurbs = failure):
- Draw tone and attitude from trailers, reveal cinematics, music videos, cutscenes, memes, and fan-quoted scenes tied to THIS character — but express it in generic English island dialogue.
- Across the full phrase set, at least half of all options must feel like a specific famous moment fans would recognize (signature catchphrase energy, visual gag, boss-line attitude, viral clip vibe) without naming the source.
- Video-game characters: channel in-game voice and marketing energy — not polite small talk.`;

const EXPLICIT_LANGUAGE_RULES = `LANGUAGE & TONE (match the source — no censorship):
- This dictionary mirrors in-game dialogue slots; there is no content filter.
- Reproduce canon profanity, crude jokes, sexual innuendo, and swearing when the character uses them.
- Do not sanitize, bowdlerize, or replace swears with mild euphemisms unless the canon line is mild.`;

const CANON_DIALOGUE_RULES = `CANON DIALOGUE (required — wrong character or generic filler = failure):
- Lock onto ONE character: the named CHARACTER and their source work from name + Extra. Do not write lines for a different character with a similar name.
- Each phrase must be a quote, tight paraphrase, or unmistakable reference to THAT character's canon (catchphrase, job, running gag, relationship energy, famous scene) — expressed as generic island dialogue.
- Match their speech habits: tics, sarcasm, formality, profanity level, sleepy mumbles, food lines, etc.
- FORBIDDEN: bland villager filler ("Hey!", "Yay!", "So happy!", "Life is good", "Best day", "You know it!", "Good to see you!") and lines that could belong to any random islander.
- Do not add trailing periods or commas unless that punctuation is part of a famous canon line.
- If the source is obscure, use Extra notes to lock canon; never invent an unrelated franchise or OC voice.`;

const INTERACTION_TOPIC_RULES = `INTERACTION TOPICS (Living the Dream):
- Each topic value MUST be an object: { "text": "short topic in English", "kind": "person"|"thing"|"activity"|"other" }
- kind "person": the topic is mainly about a person or relationship type (generic — never a copyrighted name)
- kind "thing": the topic is mainly about an object, food, place, or tangible thing
- kind "activity": the topic is mainly about a hobby, sport, or shared activity
- kind "other": anything that does not fit the above
- text must be generic island dialogue — no franchise or trademark names`;

const LTD_GIFTS_RULES = `LEVEL-UP GIFTS (Tomodachi Life: Living the Dream — pick EXACT catalog names):
Suggest exactly ONE value per JSON key below. Each value MUST be copied exactly from the allowed list for that key (same spelling and punctuation).
${formatGiftCatalogForPrompt()}`;

const JSON_ARRAY_RULES = `- Each value MUST be a JSON array containing exactly ${AI_INITIAL_BATCH_SIZE} distinct string options.
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
    ? `\nExtra (source / series / role — hidden context only, do not quote in output):\n${extra.trim()}\n`
    : '\nExtra: (none — infer source work from the character name for voice; still channel iconic energy in generic English dialogue)\n';
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
  return `You are quoting spoken dialogue and suggesting level up rewards from ONE character's ORIGINAL canon for a life-simulation dialogue UI.

${characterIdentityBlock(newName, newExtra)}
${CANON_DIALOGUE_RULES}
${CANON_MOMENTS_RULES}
${EXPLICIT_LANGUAGE_RULES}
${TOMODACHI_LINGO_RULES}
${PHRASE_LENGTH_RULES}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Level-up gifts (Living the Dream):
${LTD_GIFTS_RULES}

Rules:
${TOMODACHI_LINGO_RULES}
${JSON_ARRAY_RULES}
- "Starting a sentence" = opener fragment; "Ending a sentence" = closer fragment (may start with punctuation).
- Self-check each string length before output; truncate if needed.
- This request is standalone — ignore any prior conversation; focus only on "${newName}".

Return ONLY valid JSON:
{
  "phrases": {
    "catchphrases": ["canon line here"],
    "startingSentence": ["So,"],
    "endingSentence": ["...yeah"],
    "beforeEating": ["canon line here"],
    "shoutAtSea": ["canon line here"],
    "whenHappy": ["canon line here"],
    "whenSad": ["canon line here"],
    "whenAngry": ["canon line here"],
    "whileSleeping": ["canon line here"],
    "greeting": ["canon line here"]
  },
  "levelUpRewards": {
    "song": "song description",
    "interior": "interior description",
    "clothing": "clothing description",
    "hat": "hat description",
    "goods": "goods description",
    "quirks": "quirk description"
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

  return `Write outgoing nicknames and conversation topics from ONE character's source canon for a life-simulation cast.

${characterIdentityBlock(newName, newExtra)}
${canonNicknameRules(newName)}

Island cast (names + source notes only — do NOT reuse generic nicknames from other islanders):
${cast}

Rules:
${SHORT_TEXT_LIMIT_RULES}
- Provide exactly ${AI_INITIAL_BATCH_SIZE} distinct nickname options per array.
${includeDefaults ? `- nicknameDefault: an array of default nicknames "${newName}" uses for strangers / new acquaintances.` : '- Do NOT include nicknameDefault in the JSON.'}
${hasCast
    ? `- byTargetName: for EACH cast member listed above, an array of nicknames "${newName}" would use (relationship-specific, from canon).
- interactionTopics: for EACH cast member listed above, suggest ONE conversation topic object that "${newName}" would use to talk to them.
${INTERACTION_TOPIC_RULES}`
    : `- byTargetName: use {} (no other islanders yet).
- interactionTopics: use {} (no other islanders yet).`}
- This request is standalone — ignore any prior conversation; focus only on "${newName}".

Return ONLY valid JSON:
{
  ${includeDefaults ? '"nicknameDefault": ["canon nickname here"],' : ''}
  "byTargetName": { "Cast Member Name": ["canon nickname here"] },
  "interactionTopics": { "Cast Member Name": { "text": "topic here", "kind": "activity" } }
}`;
}

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
${TOMODACHI_LINGO_RULES}
${PHRASE_LENGTH_RULES}

Phrase category: ${phraseLabel(type)} (JSON key: ${type})
- Hard limit for this line: ${limit}.
- Must be canon for "${character.name}" only — quote, paraphrase, or specific reference from their source.

EXISTING lines for this type (do NOT duplicate):
${JSON.stringify(existing)}

Rules:
${TOMODACHI_LINGO_RULES}
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
${TOMODACHI_LINGO_RULES}
- Outgoing nicknames: at most ${MAX_SHORT_TEXT_LENGTH} characters each.
- Incoming nicknames: short and in-character from each speaker's canon.
- Do not duplicate existing nicknames already on the island.
- Include ONLY keys listed above; omit everyone else.

Return ONLY valid JSON:
{
  "outgoing": { "Islander Name": "nickname" },
  "incoming": { "Islander Name": "nickname" }
}`;
}

export function buildLevelUpRewardsPrompt(
  character: Character,
): string {
  return `Suggest level-up gifts for ONE character based on their background canon for Tomodachi Life: Living the Dream.
  
${characterIdentityBlock(character.name, character.extra)}
${formatCharacterExtraBlock(character)}

${LTD_GIFTS_RULES}
${TOMODACHI_LINGO_RULES}

Return ONLY valid JSON:
{
  "song": "expression from list",
  "interior": "interior set from list",
  "clothing": "clothing gift from list",
  "hat": "pocket money or gadget from list",
  "goods": "prezzie from list",
  "quirks": "little quirk from list"
}`;
}

export function buildInteractionTopicPrompt(
  subject: Character,
  target: Character,
): string {
  return `Suggest ONE topic of conversation that "${subject.name}" would use to talk to "${target.name}" based on their background lore / series.
  
Character 1:
${characterIdentityBlock(subject.name, subject.extra)}

Character 2:
${characterIdentityBlock(target.name, target.extra)}

Determine the relationship/interactions between these two characters.
Suggest a specific topic or conversation starter that Character 1 ("${subject.name}") would bring up when talking to Character 2 ("${target.name}").

${TOMODACHI_LINGO_RULES}
${INTERACTION_TOPIC_RULES}

Return ONLY valid JSON:
{
  "topic": { "text": "topic here", "kind": "thing" }
}`;
}

export function buildMissingInteractionTopicsPrompt(
  subject: Character,
  targets: Character[],
): string {
  const targetList = targets.map(t => `- ${t.name}${t.extra ? ` — ${t.extra}` : ''}`).join('\n');
  return `Suggest conversation topics that "${subject.name}" would use to talk to other characters on the island.
  
Character 1 (speaker):
${characterIdentityBlock(subject.name, subject.extra)}

Other characters on the island:
${targetList}

Suggest exactly ONE conversation topic for each of the other characters listed above.
The topic should be a specific, interesting, and fun subject that "${subject.name}" would talk to them about, based on their backgrounds or lore.

${INTERACTION_TOPIC_RULES}
- Keep text short (a few words or a single sentence).

Return ONLY valid JSON in the format:
{
  "topics": {
    "Target Name 1": { "text": "topic here", "kind": "activity" },
    "Target Name 2": { "text": "topic here", "kind": "thing" }
  }
}`;
}

export function buildIslandRegenerateBatchPrompt(data: DictionaryData): string {
  const castLines = data.characters
    .map((c) => `- id "${c.id}": ${c.name}${c.extra ? ` (${c.extra})` : ''}`)
    .join('\n');

  const phraseKeys = PHRASE_TYPES.map(({ key }) => `"${key}"`).join(', ');

  return `Regenerate ALL player-visible dialogue and social data for an entire Tomodachi island in ONE response.

${NO_URL_RULES}
${TOMODACHI_LINGO_RULES}
${CANON_DIALOGUE_RULES}
${CANON_MOMENTS_RULES}
${EXPLICIT_LANGUAGE_RULES}
${PHRASE_LENGTH_RULES}
${SHORT_TEXT_LIMIT_RULES}
${INTERACTION_TOPIC_RULES}
${LTD_GIFTS_RULES}

CAST (preserve these ids exactly — nicknames and interactionTopics use target CHARACTER IDs as keys):
${castLines}

INPUT JSON (same shape must be returned):
${serializeIslandJsonCompact(data)}

TASK:
- Rewrite phrases, nicknameDefaults, nicknames, levelUpRewards, and interactionTopics for EVERY character.
- Keep each character's "id", "name", "extra", and "createdAt" EXACTLY unchanged.
- Do NOT include "avatar" in output (omit the field).
- phrases: arrays of strings per key (${phraseKeys}); up to 3 lines per type, canon-accurate voice.
- nicknames: keys are TARGET character ids from the cast list above; values are string arrays.
- interactionTopics: keys are TARGET character ids; values are { "text", "kind" } objects.
- levelUpRewards: use exact Living the Dream catalog names (song=Expression, hat=Pocket money/gadget, goods=Prezzie, quirks=Little quirk).
- This is a standalone request — no conversation history. Return ONLY the full JSON object, no markdown.

Return ONLY valid JSON with the same top-level shape:
{
  "version": 1,
  "characters": [ ... ]
}`;
}