import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Character,
  type DictionaryData,
  type PhraseType,
  createCharacter,
} from '../types';
import {
  MAX_CHARACTER_EXTRA_LENGTH,
  MAX_NICKNAME_OPTIONS,
  MAX_PHRASES_PER_TYPE,
} from '../constants';
import { dedupeNicknames } from '../lib/nicknames';
import {
  clampOutgoingNickname,
  clampPhraseForType,
} from '../lib/textLimits';
import { backfillCreatedAt } from '../lib/characterDates';
import { migrateCharacter } from '../types';
import {
  emptyIsland,
  loadIslandData,
  normalizeIsland,
  saveIslandLocallySafe,
  saveIslandToCloudSafe,
} from '../lib/islandPersistence';
import { clearStorage, saveToStorage } from '../lib/storage';
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const pendingData = useRef<DictionaryData | null>(null);
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageModeRef = useRef(storageMode);
  const userIdRef = useRef(userId);
  storageModeRef.current = storageMode;
  userIdRef.current = userId;

  const applyPendingData = useCallback((data: DictionaryData) => {
    pendingData.current = normalizeIsland(data);
  }, []);

  const runCloudSave = useCallback(
    async (data: DictionaryData, userIdOverride?: string) => {
      const uid = userIdOverride ?? userIdRef.current;
      if (!uid) return null;
      setSyncStatus('saving');
      const cloudErr = await saveIslandToCloudSafe(uid, data);
      if (cloudErr) {
        setSyncStatus('error');
        setSyncError(cloudErr);
      } else {
        setSyncError(null);
        setSyncStatus('saved');
      }
      return cloudErr;
    },
    [],
  );

  const queueCloudSave = useCallback(
    (data: DictionaryData) => {
      if (storageModeRef.current !== 'cloud' || !userIdRef.current) return;
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = setTimeout(() => {
        cloudSaveTimer.current = null;
        void runCloudSave(data);
      }, 800);
    },
    [runCloudSave],
  );

  const persistData = useCallback(
    (next: Character[]) => {
      const data: DictionaryData = { version: 1, characters: next };
      applyPendingData(data);
      if (storageModeRef.current === 'local') {
        void saveIslandLocallySafe(data).then((localErr) => {
          if (localErr) {
            setSyncStatus('error');
            setSyncError(localErr);
          }
        });
        return;
      }
      queueCloudSave(data);
    },
    [applyPendingData, queueCloudSave],
  );

  const syncToCloud = useCallback(async () => {
    if (storageModeRef.current !== 'cloud' || !userIdRef.current) return;
    if (!pendingData.current) return;
    if (cloudSaveTimer.current) {
      clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = null;
    }
    await runCloudSave(pendingData.current);
  }, [runCloudSave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!pendingData.current) return;
      if (storageModeRef.current === 'local') {
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
      if (cloudSaveTimer.current) {
        clearTimeout(cloudSaveTimer.current);
        cloudSaveTimer.current = null;
      }
    };
  }, []);

  const updateCharacters = useCallback(
    (updater: (prev: Character[]) => Character[]) => {
      setCharacters((prev) => {
        const next = updater(prev);
        persistData(next);
        return next;
      });
    },
    [persistData],
  );

  const applyCharacters = useCallback(
    (chars: Character[]) => {
      const next = backfillCreatedAt(chars);
      setCharacters(next);
      setSelectedId(null);
      persistData(next);
    },
    [persistData],
  );

  const clearAllData = useCallback(async () => {
    const empty: DictionaryData = { version: 1, characters: [] };
    setCharacters([]);
    setSelectedId(null);
    applyPendingData(empty);
    if (storageMode === 'cloud' && userId) {
      await saveIslandToCloud(userId, empty);
    } else {
      clearStorage();
    }
  }, [applyPendingData, storageMode, userId]);

  useEffect(() => {
    let cancelled = false;
    const loadUserId = userId;
    const loadStorageMode = storageMode;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const loaded = await loadIslandData(loadStorageMode, loadUserId);
        if (cancelled) return;
        const normalized = normalizeIsland(loaded ?? emptyIsland());
        applyPendingData(normalized);
        setCharacters(backfillCreatedAt(normalized.characters));
        setSelectedId(null);
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
      if (
        loadStorageMode === 'cloud' &&
        loadUserId &&
        pendingData.current
      ) {
        void saveIslandToCloudSafe(loadUserId, pendingData.current);
      }
    };
  }, [applyPendingData, storageMode, userId]);

  const selected =
    characters.find((c) => c.id === selectedId) ?? null;

  const addCharacter = useCallback(
    (name: string, extra?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const char = createCharacter(trimmed, undefined, extra);
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
        const next = prev.filter((c) => c.id !== id);
        return next.map((c) => {
          const nicknames = { ...c.nicknames };
          delete nicknames[id];
          return { ...c, nicknames };
        });
      });
    },
    [updateCharacters],
  );

  const updateCharacterName = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      updateCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
      );
    },
    [updateCharacters],
  );

  const updateCharacterExtra = useCallback(
    (id: string, extra: string) => {
      const next = extra.slice(0, MAX_CHARACTER_EXTRA_LENGTH);
      updateCharacters((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, extra: next || undefined } : c,
        ),
      );
    },
    [updateCharacters],
  );

  const updateCharacterAvatar = useCallback(
    (id: string, avatar: string | undefined) => {
      updateCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, avatar } : c)),
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
          list[index] = clampPhraseForType(type, text);
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
          return {
            ...c,
            phrases: {
              ...c.phrases,
              [type]: [...c.phrases[type], clampPhraseForType(type, text)],
            },
          };
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

  const updateNicknameAt = useCallback(
    (speakerId: string, targetId: string, index: number, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== speakerId) return c;
          const nicknames = { ...c.nicknames };
          const list = [...(nicknames[targetId] ?? [])];
          list[index] = value;
          nicknames[targetId] = list;
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
          const list = c.nicknames[targetId] ?? [];
          if (list.length >= MAX_NICKNAME_OPTIONS) return c;
          const nicknames = { ...c.nicknames };
          nicknames[targetId] = [...list, value];
          return { ...c, nicknames };
        }),
      );
    },
    [updateCharacters],
  );

  const updateOutgoingNicknameAt = useCallback(
    (speakerId: string, targetId: string, index: number, value: string) => {
      updateNicknameAt(speakerId, targetId, index, clampOutgoingNickname(value));
    },
    [updateNicknameAt],
  );

  const addOutgoingNicknameForTarget = useCallback(
    (speakerId: string, targetId: string, value = '') => {
      addNicknameForTarget(speakerId, targetId, clampOutgoingNickname(value));
    },
    [addNicknameForTarget],
  );

  const updateNicknameDefaultAt = useCallback(
    (charId: string, index: number, value: string) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const nicknameDefaults = [...c.nicknameDefaults];
          nicknameDefaults[index] = clampOutgoingNickname(value);
          return { ...c, nicknameDefaults };
        }),
      );
    },
    [updateCharacters],
  );

  const addNicknameDefault = useCallback(
    (charId: string, value = '') => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          if (c.nicknameDefaults.length >= MAX_NICKNAME_OPTIONS) return c;
          return {
            ...c,
            nicknameDefaults: [
              ...c.nicknameDefaults,
              clampOutgoingNickname(value),
            ],
          };
        }),
      );
    },
    [updateCharacters],
  );

  const removeNicknameDefault = useCallback(
    (charId: string, index: number) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          return {
            ...c,
            nicknameDefaults: c.nicknameDefaults.filter((_, i) => i !== index),
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
    updateCharacterExtra,
    updateCharacterAvatar,
    updatePhrase,
    addPhrase,
    removePhrase,
    updateNicknameAt,
    updateOutgoingNicknameAt,
    addNicknameForTarget,
    addOutgoingNicknameForTarget,
    removeNicknameAt,
    updateNicknameDefaultAt,
    addNicknameDefault,
    removeNicknameDefault,
    clearAllData,
    syncToCloud,
  };
}
