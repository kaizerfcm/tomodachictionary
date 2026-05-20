import { useCallback, useState } from 'react';
import { loadGeminiApiKey, saveGeminiApiKey } from '../lib/settings';

export function useSettings() {
  const [apiKey, setApiKeyState] = useState(loadGeminiApiKey);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    saveGeminiApiKey(trimmed);
    setApiKeyState(trimmed);
  }, []);

  const hasApiKey = Boolean(apiKey.trim());

  return { apiKey, setApiKey, hasApiKey };
}
