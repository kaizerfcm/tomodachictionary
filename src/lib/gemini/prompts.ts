import type { Character } from '../../types';
import { PHRASE_TYPES, type PhraseType } from '../../types';
import { getEffectiveNickname } from '../nicknames';

const PHRASE_TYPE_LIST = PHRASE_TYPES.map(
  (t) => `- ${t.key}: "${t.label}"`,
).join('\n');

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
      return `- ${c.name}: default_address="${c.nicknameDefault || '(none)'}"; samples=${sampleStr}`;
    })
    .join('\n');
}

export function buildFullCharacterPrompt(
  newName: string,
  characters: Character[],
): string {
  const island = buildIslandSnapshot(characters);
  const targets = characters.map((c) => c.name).join(', ');

  return `You are writing Tomodachi Life: Living the Dream dialogue for a custom island of parody Miis.

NEW CHARACTER: "${newName}"

EXISTING ISLANDERS (voice reference — match this edgy, meme-heavy, in-character tone):
${island || '(empty island)'}

EXISTING NAMES (for nicknames): ${targets || '(none)'}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Rules:
- Each phrase is short (under ~80 chars), spoken aloud, fits Tomodachi Life UI.
- Stay faithful to the source character "${newName}" (memes, canon personality, catchphrases).
- "Starting a sentence" = opener fragment; "Ending a sentence" = closer fragment (can start with punctuation).
- "Shout at the sea" = ALL CAPS energy.
- Provide exactly 3 distinct options per phrase type (triplets).
- nicknameDefault: how THIS character addresses strangers / new islanders they don't know well.
- byTargetName: for EACH existing islander listed, 3 nickname options THIS character would use (insulting, affectionate, or in-joke — match island tone).
- incoming.bySpeakerName: for EACH existing islander, 3 nickname options THEY would use for "${newName}" (from their voice; use their default_address style from samples).

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

export function buildMorePhrasesPrompt(
  character: Character,
  allCharacters: Character[],
): string {
  const existing = Object.fromEntries(
    PHRASE_TYPES.map(({ key }) => [key, character.phrases[key]]),
  );

  return `You are writing MORE Tomodachi Life dialogue lines for "${character.name}".

Island tone reference:
${buildIslandSnapshot(allCharacters, character.id)}

EXISTING LINES (do NOT duplicate or lightly rephrase these):
${JSON.stringify(existing, null, 2)}

Phrase types (exact JSON keys):
${PHRASE_TYPE_LIST}

Provide exactly 3 NEW options per type — fresh lines, same voice, no repeats.

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
  }
}`;
}

export function buildRegenerateNicknamesPrompt(
  character: Character,
  allCharacters: Character[],
): string {
  const others = allCharacters.filter((c) => c.id !== character.id);
  const outgoingCurrent: Record<string, string> = {
    _default: character.nicknameDefault || '(empty)',
  };
  for (const t of others) {
    outgoingCurrent[t.name] = getEffectiveNickname(character, t);
  }

  const incomingCurrent: Record<string, string> = {};
  for (const speaker of others) {
    incomingCurrent[speaker.name] = getEffectiveNickname(speaker, character);
  }

  return `You are refining Tomodachi Life island nicknames for "${character.name}".

Island context:
${buildIslandSnapshot(allCharacters, character.id)}

CURRENT — how "${character.name}" calls others:
${JSON.stringify(outgoingCurrent, null, 2)}

CURRENT — how others call "${character.name}":
${JSON.stringify(incomingCurrent, null, 2)}

Improve nicknames to be funnier, more in-character, and consistent with the island tone. Keep good existing ones but you may offer better alternatives in the 3 options.

Targets to include in byTargetName: ${others.map((c) => c.name).join(', ')}
Speakers to include in incoming.bySpeakerName: ${others.map((c) => c.name).join(', ')}

Return ONLY valid JSON:
{
  "nicknameDefault": ["", "", ""],
  "byTargetName": { "Target Name": ["", "", ""] },
  "incoming": {
    "bySpeakerName": { "Speaker Name": ["", "", ""] }
  }
}`;
}
