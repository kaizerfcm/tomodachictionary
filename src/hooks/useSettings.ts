import { useCallback, useMemo, useState } from 'react';
import type { AiSettings } from '../lib/ai/types';
import {
  apiKeyForProvider,
  loadAiProvider,
  loadGeminiApiKey,
  loadGroqApiKey,
  loadOpenRouterApiKey,
  saveAiProvider,
  saveApiKeyForProvider,
} from '../lib/settings';

export function useSettings(signedIn = false) {
  const [provider, setProviderState] = useState(loadAiProvider);
  const [geminiKey, setGeminiKey] = useState(loadGeminiApiKey);
  const [groqKey, setGroqKey] = useState(loadGroqApiKey);
  const [openRouterKey, setOpenRouterKey] = useState(loadOpenRouterApiKey);

  const apiKey = useMemo(() => {
    switch (provider) {
      case 'groq':
        return groqKey;
      case 'openrouter':
        return openRouterKey;
      default:
        return geminiKey;
    }
  }, [provider, geminiKey, groqKey, openRouterKey]);

  const setApiKey = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      saveApiKeyForProvider(provider, trimmed);
      if (provider === 'groq') setGroqKey(trimmed);
      else if (provider === 'openrouter') setOpenRouterKey(trimmed);
      else setGeminiKey(trimmed);
    },
    [provider],
  );

  const setProvider = useCallback((next: typeof provider) => {
    saveAiProvider(next);
    setProviderState(next);
  }, []);

  const hasApiKey =
    provider === 'hosted' ? signedIn : Boolean(apiKey.trim());

  const aiSettings: AiSettings = useMemo(
    () => ({
      provider,
      apiKey: apiKeyForProvider(provider),
      canUseHosted: signedIn,
    }),
    [provider, apiKey, signedIn],
  );

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    geminiKey,
    groqKey,
    openRouterKey,
    hasApiKey,
    aiSettings,
  };
}
