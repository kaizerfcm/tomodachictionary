import { useCallback, useState } from 'react';
import { loadLlmHost, saveLlmHost } from '../lib/settings';

export function useSettings() {
  const [llmHost, setLlmHostState] = useState(loadLlmHost);

  const setLlmHost = useCallback((host: string) => {
    const trimmed = host.trim();
    saveLlmHost(trimmed);
    setLlmHostState(trimmed);
  }, []);

  const hasLlmHost = Boolean(llmHost.trim());

  return { llmHost, setLlmHost, hasLlmHost };
}
