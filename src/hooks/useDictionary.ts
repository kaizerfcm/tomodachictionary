import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Character,
  type DictionaryData,
  type InteractionTopicKind,
  type PhraseType,
  createCharacter,
} from '../types';
import {
  MAX_CHARACTER_EXTRA_LENGTH,
  MAX_NICKNAME_OPTIONS,
  MAX_PHRASES_PER_TYPE,
} from '../constants';
import { dedupeNicknames, sanitizeCharacterNicknames } from '../lib/nicknames';
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
  persistIslandsStore,
  saveIslandLocallySafe,
} from '../lib/islandPersistence';
import {
  addIslandWithData,
  createNewIsland,
  deleteIsland,
  getActiveIsland,
  loadIslandsStore,
  renameIsland,
  replaceActiveIslandData,
  setActiveIslandId,
  updateActiveIslandData,
  type IslandEntry,
  type IslandsStore,
} from '../lib/islandsStore';

export function useDictionary() {
  const [islandsStore, setIslandsStore] = useState<IslandsStore>(() =>
    loadIslandsStore(),
  );
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingData = useRef<DictionaryData | null>(null);

  const activeIsland = getActiveIsland(islandsStore);

  const applyStore = useCallback((store: IslandsStore) => {
    persistIslandsStore(store);
    setIslandsStore(store);
    const island = getActiveIsland(store);
    const normalized = normalizeIsland(island.data);
    pendingData.current = normalized;
    setCharacters(backfillCreatedAt(normalized.characters));
  }, []);

  const persistData = useCallback(
    (next: Character[]) => {
      const data: DictionaryData = { version: 1, characters: next };
      pendingData.current = normalizeIsland(data);
      void saveIslandLocallySafe(data).then((localErr) => {
        if (localErr) {
          setSaveError(localErr);
        } else {
          setSaveError(null);
        }
      });
      setIslandsStore((prev) => updateActiveIslandData(prev, data));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const store = loadIslandsStore();
        const loaded = await loadIslandData();
        if (cancelled) return;
        setIslandsStore(store);
        const normalized = normalizeIsland(loaded ?? emptyIsland());
        pendingData.current = normalized;
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
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!pendingData.current) return;
      try {
        const store = loadIslandsStore();
        persistIslandsStore(updateActiveIslandData(store, pendingData.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
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

  const replaceActiveIsland = useCallback(
    (data: DictionaryData) => {
      const normalized = normalizeIsland(data);
      setCharacters(backfillCreatedAt(normalized.characters));
      setSelectedId(null);
      pendingData.current = normalized;
      const store = replaceActiveIslandData(loadIslandsStore(), normalized);
      applyStore(store);
    },
    [applyStore],
  );

  const importAsNewIsland = useCallback(
    (name: string, data: DictionaryData) => {
      const store = addIslandWithData(loadIslandsStore(), name, data);
      applyStore(store);
      setSelectedId(null);
    },
    [applyStore],
  );

  const switchIsland = useCallback(
    (id: string) => {
      const store = setActiveIslandId(loadIslandsStore(), id);
      applyStore(store);
      setSelectedId(null);
    },
    [applyStore],
  );

  const createIsland = useCallback(
    (name?: string) => {
      const store = createNewIsland(loadIslandsStore(), name);
      applyStore(store);
      setSelectedId(null);
    },
    [applyStore],
  );

  const renameActiveIsland = useCallback(
    (name: string) => {
      const store = renameIsland(loadIslandsStore(), activeIsland.id, name);
      applyStore(store);
    },
    [activeIsland.id, applyStore],
  );

  const removeActiveIsland = useCallback(() => {
    const store = deleteIsland(loadIslandsStore(), activeIsland.id);
    if (!store) return false;
    applyStore(store);
    setSelectedId(null);
    return true;
  }, [activeIsland.id, applyStore]);

  const clearAllData = useCallback(async () => {
    const empty: DictionaryData = { version: 1, characters: [] };
    setCharacters([]);
    setSelectedId(null);
    pendingData.current = empty;
    const store = replaceActiveIslandData(loadIslandsStore(), empty);
    applyStore(store);
  }, [applyStore]);

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

  const applyRegeneratedContent = useCallback(
    (
      charId: string,
      patch: {
        phrases: Character['phrases'];
        nicknameDefaults: string[];
        nicknames: Record<string, string[]>;
        levelUpRewards?: Character['levelUpRewards'];
        interactionTopics?: Character['interactionTopics'];
      },
    ) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const { nicknameDefaults, nicknames } = sanitizeCharacterNicknames({
            nicknameDefaults: patch.nicknameDefaults,
            nicknames: patch.nicknames,
          });
          return {
            ...c,
            phrases: patch.phrases,
            nicknameDefaults,
            nicknames,
            levelUpRewards: patch.levelUpRewards ?? c.levelUpRewards,
            interactionTopics: patch.interactionTopics ?? c.interactionTopics,
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
          const interactionTopics = { ...c.interactionTopics };
          delete interactionTopics[id];
          return { ...c, nicknames, interactionTopics };
        });
      });
    },
    [updateCharacters],
  );

  const updateLevelUpRewards = useCallback(
    (charId: string, levelUpRewards: Character['levelUpRewards']) => {
      updateCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? {
                ...c,
                levelUpRewards,
              }
            : c,
        ),
      );
    },
    [updateCharacters],
  );

  const updateInteractionTopic = useCallback(
    (
      charId: string,
      targetId: string,
      text: string,
      kind: InteractionTopicKind = 'other',
    ) => {
      updateCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== charId) return c;
          const interactionTopics = { ...(c.interactionTopics ?? {}) };
          if (text.trim()) {
            interactionTopics[targetId] = { text: text.trim(), kind };
          } else {
            delete interactionTopics[targetId];
          }
          return { ...c, interactionTopics };
        }),
      );
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
          nicknames[targetId] = dedupeNicknames(list);
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
          nicknames[targetId] = dedupeNicknames([...list, value]);
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
          return {
            ...c,
            nicknameDefaults: dedupeNicknames(nicknameDefaults),
          };
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
            nicknameDefaults: dedupeNicknames([
              ...c.nicknameDefaults,
              clampOutgoingNickname(value),
            ]),
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

  const islands: IslandEntry[] = islandsStore.islands;

  return {
    characters,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    saveError,
    islands,
    activeIslandId: islandsStore.activeIslandId,
    activeIslandName: activeIsland.name,
    switchIsland,
    createIsland,
    renameActiveIsland,
    removeActiveIsland,
    replaceActiveIsland,
    importAsNewIsland,
    addCharacter,
    addCharacterFull,
    appendPhrasesBatch,
    appendOutgoingNicknames,
    appendIncomingNicknames,
    applyCharacters,
    applyRegeneratedContent,
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
    updateLevelUpRewards,
    updateInteractionTopic,
    clearAllData,
  };
}
