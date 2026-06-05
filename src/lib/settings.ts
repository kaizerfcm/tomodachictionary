const LLM_HOST_STORAGE = 'tomodict-llm-host';

export function loadLlmHost(): string {
  try {
    return localStorage.getItem(LLM_HOST_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveLlmHost(host: string): void {
  localStorage.setItem(LLM_HOST_STORAGE, host.trim());
}

export function clearLlmHost(): void {
  localStorage.removeItem(LLM_HOST_STORAGE);
}
