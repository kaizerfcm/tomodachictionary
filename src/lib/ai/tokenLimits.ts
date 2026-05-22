/** Output token caps per operation (input is trimmed separately in prompts). */
export const AI_TOKENS = {
  singleLine: 128,
  /** Per chunk when Fill missing is split (many islanders). */
  missingNicknames: 2048,
  fullCharacter: 4096,
} as const;
