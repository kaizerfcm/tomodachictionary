const GEMINI_KEY_STORAGE = 'tomodachi-gemini-api-key';

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

export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}
