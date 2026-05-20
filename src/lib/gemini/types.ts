import type { PhraseType } from '../../types';

export type Triplet = [string, string, string];

export type GeneratedPhrases = Record<PhraseType, Triplet>;

export interface GeneratedOutgoingNicknames {
  nicknameDefault: Triplet;
  byTargetName: Record<string, Triplet>;
}

/** How other islanders should call this character (one triplet per speaker). */
export interface GeneratedIncomingNicknames {
  bySpeakerName: Record<string, Triplet>;
}

export interface FullCharacterGeneration {
  phrases: GeneratedPhrases;
  outgoing: GeneratedOutgoingNicknames;
  incoming: GeneratedIncomingNicknames;
}

export interface NicknameRegeneration {
  nicknameDefault: Triplet;
  byTargetName: Record<string, Triplet>;
  incoming: GeneratedIncomingNicknames;
}
