/** Output token caps per operation (input is trimmed separately in prompts). */
export const AI_TOKENS = {
  singleLine: 256,
  /** Per chunk when Fill missing is split (many islanders). */
  missingNicknames: 4096,
  /** Initial canon phrases for a new character (one line per type). */
  fullCharacterPhrases: 8192,
  /** Initial outgoing nicknames for a new character. */
  fullCharacterNicknames: 8192,
  /** Whole-island batch regeneration (single JSON in/out). */
  islandBatchBase: 8192,
  islandBatchPerCharacter: 4096,
  islandBatchMax: 65536,
} as const;
