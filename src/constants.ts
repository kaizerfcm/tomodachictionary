/** App display name. */
export const APP_NAME = 'Tomodict';

/** Max dialogue lines per phrase type (public deployment). */
export const MAX_PHRASES_PER_TYPE = 10;

/** Max nickname options per target (and default list). */
export const MAX_NICKNAME_OPTIONS = 10;

/** How many options Gemini adds per batch. */
export const AI_BATCH_SIZE = 1;

/** Max islanders per Fill-missing Gemini request (avoids truncated JSON). */
export const MISSING_NICKNAMES_CHUNK_SIZE = 12;

/** Max character name length. */
export const MAX_CHARACTER_NAME_LENGTH = 24;

/** Optional source / notes for AI generation. */
export const MAX_CHARACTER_EXTRA_LENGTH = 512;

/** Starting/ending sentence fragments and “calls others” nicknames (game UI limit). */
export const MAX_SHORT_TEXT_LENGTH = 13;

/** Avatar stored as JPEG data URL (px). */
export const AVATAR_MAX_PX = 128;

/** JPEG quality for avatar storage (0–1). */
export const AVATAR_JPEG_QUALITY = 0.55;
