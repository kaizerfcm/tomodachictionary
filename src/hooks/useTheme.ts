import { useCallback, useEffect, useState } from 'react';
import {
  applyThemePreference,
  getThemePreference,
  resolveTheme,
  setThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme';

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    getThemePreference,
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(getThemePreference()),
  );

  useEffect(() => {
    setResolved(applyThemePreference(preference));
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolved(applyThemePreference('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setThemePreference(pref);
    setPreferenceState(pref);
  }, []);

  return { preference, resolved, setPreference };
}
