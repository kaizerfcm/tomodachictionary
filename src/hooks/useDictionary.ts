import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Character,
  type DictionaryData,
  type PhraseType,
  createCharacter,
} from '../types';
import { parseSeedMarkdown, validateParsed } from '../lib/parseSeed';
import {
  applyNicknameSeed,
  type NicknameSeed,
} from '../lib/nicknames';
import {
  loadIslandFromCloud,
  saveIslandToCloud,
} from '../lib/cloudStorage';
import {
  areSeedsAvailable,
  clearStorage,
  fetchNicknameSeed,
  fetchSeedMarkdown,
  loadFromStorage,
  saveToStorage,
} from '../lib/storage';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseDictionaryOptions {
  storageMode: 'local' | 'cloud';
  userId?: string | null;
}

export function useDictionary({
  storageMode,
  userId,
}: UseDictionaryOptions) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedsAvailable, setSeedsAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: Character[]) => {
      const data: DictionaryData = { version: 1, characters: next };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (storageMode === 'cloud' && userId) {
          setSyncStatus('saving');
          setSyncError(null);
          try {
            await saveIslandToCloud(userId, data);
            setSyncStatus('saved');
          } catch (e) {
            setSyncStatus('error');
            setSyncError(
              e instanceof Error ? e.message : 'Failed to sync to cloud',
            );
          }
        } else {
          saveToStorage(data);
        }
      }, 300);
    },
    [storageMode, userId],
  );

  const updateCharacters = useCallback(
    (updater: (prev: Character[]) => Character[]) => {
      setCharacters((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const applyCharacters = useCallback(
    (chars: Character[]) => {
      setCharacters(chars);
      setSelectedId(chars[0]?.id ?? null);
      persist(chars);
    },
    [persist],
  );

  const loadFromSeed = useCallback(async () => {
    const [md, nicknamesRaw] = await Promise.all([
      fetchSeedMarkdown(),
      fetchNicknameSeed(),
    ]);
    if (!md) {
      throw new Error(
        'Seed files not found. Add public/seed.md and public/nicknames-seed.json locally, or start with an empty island.',
      );
    }
    const parsed = parseSeedMarkdown(md);
    validateParsed(parsed);
    let withNicknames = parsed;
    if (nicknamesRaw) {
      const nicknameSeed = JSON.parse(nicknamesRaw) as NicknameSeed;
      withNicknames = applyNicknameSeed(parsed, nicknameSeed);
    }
    applyCharacters(withNicknames);
    return withNicknames;
  }, [applyCharacters]);

  const clearAllData = useCallback(async () => {
    const empty: Character[] = [];
    setCharacters(empty);
    setSelectedId(null);
    if (storageMode === 'cloud' && userId) {
      await saveIslandToCloud(userId, { version: 1, characters: [] });
    } else {
      clearStorage();
    }
  }, [storageMode, userId]);

  const resetFromSeed = useCallback(async () => {
    if (storageMode === 'cloud') {
      clearStorage();
    } else {
      clearStorage();
    }
    await loadFromSeed();
  }, [loadFromSeed, storageMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const seeds = await areSeedsAvailable();
        if (!cancelled) setSeedsAvailable(seeds);

        if (storageMode === 'cloud' && userId) {
          const cloud = await loadIslandFromCloud(userId);
          if (cloud && cloud.characters.length > 0) {
            if (!cancelled) {
              setCharacters(cloud.characters);
              setSelectedId(cloud.characters[0]?.id ?? null);
            }
          } else if (seeds) {
            await loadFromSeed();
            if (!cancelled) setSyncStatus('saved');
          } else if (!cancelled) {
            setCharacters([]);
            setSelectedId(null);
          }
        } else {
          const stored = loadFromStorage();
          if (stored && stored.characters.length > 0) {
            let chars = stored.characters;
            const hasNicknameData = chars.some(
              (c) =>
                Boolean(c.nicknameDefault) ||
                Object.keys(c.nicknames).length > 0,
            );
            if (!hasNicknameData && seeds) {
              const nicknamesRaw = await fetchNicknameSeed();
              if (nicknamesRaw) {
                const nicknameSeed = JSON.parse(nicknamesRaw) as NicknameSeed;
                chars = applyNicknameSeed(chars, nicknameSeed);
                saveToStorage({ version: 1, characters: chars });
              }
            }
            if (!cancelled) {
              setCharacters(chars);
              setSelectedId(chars[0]?.id ?? null);
            }
          } else if (seeds) {
            await loadFromSeed();
          } else if (!cancelled) {
            setCharacters([]);
            setSelectedId(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageMode, userId, loadFromSeed]);

  const selected =
    characters.find((c) => c.id === selectedId) ?? null;

  const addCharacter = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const char = createCharacter(trimmed);
      updateCharacters((prev) => [...prev, char]);
      setSelectedId(char.id);
      return char;
    },
    [updateCharacters],
  );

  const addCharacterFull = useCallback(
    (
      char: Character,
      incomingNicknames: Record<string, string>,
    ) => {
      updateCharacters((prev) => {
        const next = [
          ...prev.map((c) => {
            const nick = incomingNicknames[c.id];
            if (!nick || nick === c.nicknameDefault) return c;
            return {
              ...c,
              nicknames: { ...c.nicknames, [char.id]: nick },
            };
          }),
          char,
        ];
        return next;
      });
      setSelectedId(char.id);
      return char;
    },
    [updateCharacters],
  );

  const appendPhrasesBatch = useCallback(
    (charId: string, toAppend: Partial<Record<PhraseType, string[]>>) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const phrases = { ...c.phrases };
          for (const [key, lines] of Object.entries(toAppend)) {
            const type = key as PhraseType;
            if (lines?.length) {
              phrases[type] = [...phrases[type], ...lines];
            }
          }
          return { ...c, phrases };
        }),
      );
    },
    [updateCharacters],
  );

  const applyOutgoingNicknames = useCallback(
    (
      speakerId: string,
      nicknameDefault: string,
      nicknames: Record<string, string>,
    ) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const cleaned: Record<string, string> = {};
          for (const [targetId, nick] of Object.entries(nicknames)) {
            const trimmed = nick.trim();
            if (trimmed && trimmed !== nicknameDefault) {
              cleaned[targetId] = trimmed;
            }
          }
          return {
            ...c,
            nicknameDefault: nicknameDefault.trim(),
            nicknames: cleaned,
          };
        }),
      );
    },
    [updateCharacters],
  );

  const applyIncomingNicknames = useCallback(
    (targetId: string, bySpeaker: Record<string, string>) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          const nick = bySpeaker[c.id];
          if (!nick) return c;
          const trimmed = nick.trim();
          const nicknames = { ...c.nicknames };
          if (!trimmed || trimmed === c.nicknameDefault) {
            delete nicknames[targetId];
          } else {
            nicknames[targetId] = trimmed;
          }
          return { ...c, nicknames };
        }),
      );
    },
    [updateCharacters],
  );

  const removeCharacter = useCallback(
    (id: string) => {
      updateCharacters((prev) => {
        const next = prev
          .filter((c) => c.id !== id)
          .map((c) => {
            if (!c.nicknames[id]) return c;
            const { [id]: _, ...nicknames } = c.nicknames;
            return { ...c, nicknames };
          });
        setSelectedId((cur) =>
          cur !== id ? cur : (next[0]?.id ?? null),
        );
        return next;
      });
    },
    [updateCharacters],
  );

  const updateCharacterName = useCallback(
    (id: string, name: string) => {
      updateCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)),
      );
    },
    [updateCharacters],
  );

  const updatePhrase = useCallback(
    (charId: string, type: PhraseType, index: number, text: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const phrases = { ...c.phrases };
          const list = [...phrases[type]];
          list[index] = text;
          phrases[type] = list;
          return { ...c, phrases };
        }),
      );
    },
    [updateCharacters],
  );

  const addPhrase = useCallback(
    (charId: string, type: PhraseType, text = '') => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const phrases = { ...c.phrases };
          phrases[type] = [...phrases[type], text];
          return { ...c, phrases };
        }),
      );
    },
    [updateCharacters],
  );

  const removePhrase = useCallback(
    (charId: string, type: PhraseType, index: number) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const phrases = { ...c.phrases };
          phrases[type] = phrases[type].filter((_, i) => i !== index);
          return { ...c, phrases };
        }),
      );
    },
    [updateCharacters],
  );

  const updateNicknameDefault = useCallback(
    (speakerId: string, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) =>
          c.id === speakerId
            ? { ...c, nicknameDefault: value.trim() }
            : c,
        ),
      );
    },
    [updateCharacters],
  );

  const updateNickname = useCallback(
    (speakerId: string, targetId: string, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const nicknames = { ...c.nicknames };
          const trimmed = value.trim();
          if (!trimmed || trimmed === c.nicknameDefault) {
            delete nicknames[targetId];
          } else {
            nicknames[targetId] = trimmed;
          }
          return { ...c, nicknames };
        }),
      );
    },
    [updateCharacters],
  );

  return {
    characters,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    seedsAvailable,
    storageMode,
    syncStatus,
    syncError,
    addCharacter,
    addCharacterFull,
    appendPhrasesBatch,
    applyOutgoingNicknames,
    applyIncomingNicknames,
    applyCharacters,
    removeCharacter,
    updateCharacterName,
    updatePhrase,
    addPhrase,
    removePhrase,
    updateNickname,
    updateNicknameDefault,
    resetFromSeed,
    clearAllData,
  };
}
