import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Character,
  type DictionaryData,
  type PhraseType,
  createCharacter,
} from '../types';
import { parseSeedMarkdown, validateParsed } from '../lib/parseSeed';
import { MAX_NICKNAME_OPTIONS, MAX_PHRASES_PER_TYPE } from '../constants';
import {
  applyNicknameSeed,
  dedupeNicknames,
  type NicknameSeed,
} from '../lib/nicknames';
import { backfillCreatedAt } from '../lib/characterDates';
import { migrateCharacter } from '../types';
import {
  loadIslandData,
  saveIslandLocallySafe,
  saveIslandToCloudSafe,
} from '../lib/islandPersistence';
import {
  areSeedsAvailable,
  clearStorage,
  fetchNicknameSeed,
  fetchSeedMarkdown,
  saveToStorage,
} from '../lib/storage';
import { saveIslandToCloud } from '../lib/cloudStorage';

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
  const pendingData = useRef<DictionaryData | null>(null);
  const storageModeRef = useRef(storageMode);
  const userIdRef = useRef(userId);
  storageModeRef.current = storageMode;
  userIdRef.current = userId;

  const flushPersist = useCallback(async (data: DictionaryData) => {
    const localErr = await saveIslandLocallySafe(data);
    if (localErr) {
      setSyncStatus('error');
      setSyncError(localErr);
      return;
    }

    if (storageModeRef.current === 'cloud' && userIdRef.current) {
      setSyncStatus('saving');
      setSyncError(null);
      const cloudErr = await saveIslandToCloudSafe(userIdRef.current, data);
      if (cloudErr) {
        setSyncStatus('error');
        setSyncError(cloudErr);
        return;
      }
      setSyncStatus('saved');
    } else {
      setSyncError(null);
      setSyncStatus('idle');
    }
  }, []);

  const persist = useCallback(
    (next: Character[]) => {
      const data: DictionaryData = { version: 1, characters: next };
      pendingData.current = data;

      void (async () => {
        const localErr = await saveIslandLocallySafe(data);
        if (localErr) {
          setSyncStatus('error');
          setSyncError(localErr);
        }
      })();

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void flushPersist(data);
      }, 400);
    },
    [flushPersist],
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      if (pendingData.current) {
        try {
          saveToStorage(pendingData.current);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (pendingData.current) {
        void flushPersist(pendingData.current);
      }
    };
  }, [flushPersist]);

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
      const next = backfillCreatedAt(chars);
      setCharacters(next);
      setSelectedId(null);
      persist(next);
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
        setError(null);
        const seeds = await areSeedsAvailable();
        if (!cancelled) setSeedsAvailable(seeds);

        const loaded = await loadIslandData(storageMode, userId);
        if (loaded && loaded.characters.length > 0) {
          let chars = loaded.characters;
          const hasNicknameData = chars.some(
            (c) =>
              (c.nicknameDefaults?.length ?? 0) > 0 ||
              Object.keys(c.nicknames).length > 0,
          );
          if (!hasNicknameData && seeds) {
            const nicknamesRaw = await fetchNicknameSeed();
            if (nicknamesRaw) {
              const nicknameSeed = JSON.parse(nicknamesRaw) as NicknameSeed;
              chars = applyNicknameSeed(chars, nicknameSeed);
              pendingData.current = { version: 1, characters: chars };
              await saveIslandLocallySafe({ version: 1, characters: chars });
              if (storageMode === 'cloud' && userId) {
                await saveIslandToCloudSafe(userId, { version: 1, characters: chars });
              }
            }
          }
          if (!cancelled) {
            setCharacters(backfillCreatedAt(chars));
            setSelectedId(null);
            if (storageMode === 'cloud' && userId) setSyncStatus('saved');
          }
        } else if (seeds) {
          await loadFromSeed();
          if (!cancelled && storageMode === 'cloud' && userId) {
            setSyncStatus('saved');
          }
        } else if (!cancelled) {
          setCharacters([]);
          setSelectedId(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per storage target; loadFromSeed would retrigger reloads
  }, [storageMode, userId]);

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
      incomingNicknames: Record<string, string[]>,
    ) => {
      updateCharacters((prev) => {
        const next = [
          ...prev.map((c) => {
            const incoming = incomingNicknames[c.id];
            if (!incoming?.length) return c;
            return {
              ...c,
              nicknames: {
                ...c.nicknames,
                [char.id]: dedupeNicknames([
                  ...(c.nicknames[char.id] ?? []),
                  ...incoming,
                ]),
              },
            };
          }),
          migrateCharacter(char),
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
            if (!lines?.length) continue;
            const room = MAX_PHRASES_PER_TYPE - phrases[type].length;
            if (room <= 0) continue;
            phrases[type] = [...phrases[type], ...lines.slice(0, room)];
          }
          return { ...c, phrases };
        }),
      );
    },
    [updateCharacters],
  );

  const appendOutgoingNicknames = useCallback(
    (
      speakerId: string,
      defaultOptions: string[],
      byTarget: Record<string, string[]>,
    ) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const nicknames = { ...c.nicknames };
          for (const [targetId, additions] of Object.entries(byTarget)) {
            if (!additions.length) continue;
            nicknames[targetId] = dedupeNicknames([
              ...(nicknames[targetId] ?? []),
              ...additions,
            ]);
          }
          return {
            ...c,
            nicknameDefaults: dedupeNicknames([
              ...c.nicknameDefaults,
              ...defaultOptions,
            ]),
            nicknames,
          };
        }),
      );
    },
    [updateCharacters],
  );

  const appendIncomingNicknames = useCallback(
    (targetId: string, bySpeaker: Record<string, string[]>) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          const additions = bySpeaker[c.id];
          if (!additions?.length) return c;
          return {
            ...c,
            nicknames: {
              ...c.nicknames,
              [targetId]: dedupeNicknames([
                ...(c.nicknames[targetId] ?? []),
                ...additions,
              ]),
            },
          };
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

  const updateCharacterAvatar = useCallback(
    (id: string, avatar: string | undefined) => {
      updateCharacters((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, avatar: avatar || undefined } : c,
        ),
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
          if (c.phrases[type].length >= MAX_PHRASES_PER_TYPE) return c;
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

  const updateNicknameDefaultAt = useCallback(
    (speakerId: string, index: number, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const list = [...c.nicknameDefaults];
          list[index] = value;
          return {
            ...c,
            nicknameDefaults: dedupeNicknames(list),
          };
        }),
      );
    },
    [updateCharacters],
  );

  const addNicknameDefault = useCallback((speakerId: string, value = '') => {
    updateCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== speakerId) return c;
        if (c.nicknameDefaults.length >= MAX_NICKNAME_OPTIONS) return c;
        return {
          ...c,
          nicknameDefaults: dedupeNicknames([...c.nicknameDefaults, value]),
        };
      }),
    );
  }, [updateCharacters]);

  const removeNicknameDefault = useCallback(
    (speakerId: string, index: number) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          return {
            ...c,
            nicknameDefaults: c.nicknameDefaults.filter((_, i) => i !== index),
          };
        }),
      );
    },
    [updateCharacters],
  );

  const updateNicknameAt = useCallback(
    (speakerId: string, targetId: string, index: number, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const nicknames = { ...c.nicknames };
          const list = [...(nicknames[targetId] ?? [])];
          list[index] = value;
          const cleaned = dedupeNicknames(list);
          if (cleaned.length) nicknames[targetId] = cleaned;
          else delete nicknames[targetId];
          return { ...c, nicknames };
        }),
      );
    },
    [updateCharacters],
  );

  const addNicknameForTarget = useCallback(
    (speakerId: string, targetId: string, value = '') => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const current = c.nicknames[targetId] ?? [];
          if (current.length >= MAX_NICKNAME_OPTIONS) return c;
          return {
            ...c,
            nicknames: {
              ...c.nicknames,
              [targetId]: dedupeNicknames([...current, value]),
            },
          };
        }),
      );
    },
    [updateCharacters],
  );

  const removeNicknameAt = useCallback(
    (speakerId: string, targetId: string, index: number) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const nicknames = { ...c.nicknames };
          const list = (nicknames[targetId] ?? []).filter((_, i) => i !== index);
          if (list.length) nicknames[targetId] = list;
          else delete nicknames[targetId];
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
    appendOutgoingNicknames,
    appendIncomingNicknames,
    applyCharacters,
    removeCharacter,
    updateCharacterName,
    updateCharacterAvatar,
    updatePhrase,
    addPhrase,
    removePhrase,
    updateNicknameAt,
    addNicknameForTarget,
    removeNicknameAt,
    updateNicknameDefaultAt,
    addNicknameDefault,
    removeNicknameDefault,
    resetFromSeed,
    clearAllData,
  };
}
