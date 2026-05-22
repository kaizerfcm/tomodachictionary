export type AiProviderId = 'gemini' | 'groq' | 'openrouter' | 'hosted';

export interface AiSettings {
  provider: AiProviderId;
  /** Key for the active BYOK provider (gemini / groq / openrouter). */
  apiKey: string;
  /** Signed-in users may use Tomodict cloud quota when provider is hosted. */
  canUseHosted: boolean;
}

export interface ModelCallOptions {
  prompt: string;
  maxOutputTokens: number;
}
