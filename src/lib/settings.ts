import type { AiProviderId } from './ai/types';

const GEMINI_KEY_STORAGE = 'tomodachi-gemini-api-key';
const GROQ_KEY_STORAGE = 'tomodachi-groq-api-key';
const OPENROUTER_KEY_STORAGE = 'tomodachi-openrouter-api-key';
const AI_PROVIDER_STORAGE = 'tomodachi-ai-provider';

export function loadGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

export function loadGroqApiKey(): string {
  try {
    return localStorage.getItem(GROQ_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveGroqApiKey(key: string): void {
  localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
}

export function loadOpenRouterApiKey(): string {
  try {
    return localStorage.getItem(OPENROUTER_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveOpenRouterApiKey(key: string): void {
  localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
}

export function loadAiProvider(): AiProviderId {
  try {
    const v = localStorage.getItem(AI_PROVIDER_STORAGE);
    if (v === 'groq' || v === 'openrouter' || v === 'hosted') return v;
    return 'gemini';
  } catch {
    return 'gemini';
  }
}

export function saveAiProvider(provider: AiProviderId): void {
  localStorage.setItem(AI_PROVIDER_STORAGE, provider);
}

export function apiKeyForProvider(provider: AiProviderId): string {
  switch (provider) {
    case 'groq':
      return loadGroqApiKey();
    case 'openrouter':
      return loadOpenRouterApiKey();
    case 'gemini':
    case 'hosted':
    default:
      return loadGeminiApiKey();
  }
}

export function saveApiKeyForProvider(provider: AiProviderId, key: string): void {
  switch (provider) {
    case 'groq':
      saveGroqApiKey(key);
      break;
    case 'openrouter':
      saveOpenRouterApiKey(key);
      break;
    default:
      saveGeminiApiKey(key);
  }
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}
