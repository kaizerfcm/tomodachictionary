import { useCallback, useMemo, useRef, useState } from 'react';
import {
  getGridSort,
  getIslandersNickOpen,
  setGridSort,
  setIslandersNickOpen,
  type GridSort,
} from './lib/uiPrefs';
import { sortCharacters } from './lib/sortCharacters';
import { useDictionary } from './hooks/useDictionary';
import { useSettings } from './hooks/useSettings';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { CharacterEditor } from './components/CharacterEditor';
import { CharacterGrid } from './components/CharacterGrid';
import { ConfigPage } from './components/ConfigPage';
import { TosPage } from './components/TosPage';
import { ImportIslandModal } from './components/ImportIslandModal';
import {
  AiGenerationStatus,
  type AiNotice,
} from './components/AiGenerationStatus';
import { NewCharacterModal } from './components/NewCharacterModal';
import { NewCharacterReviewModal } from './components/NewCharacterReviewModal';
import { CharacterRegenerateReviewModal } from './components/CharacterRegenerateReviewModal';
import {
  IslandRegenerateModal,
  type IslandRegenProgress,
} from './components/IslandRegenerateModal';
import {
  IslandRegenerateOptionsModal,
  type IslandRegenMode,
} from './components/IslandRegenerateOptionsModal';
import { AiLogsModal } from './components/AiLogsModal';
import { generateIslandBatchRegeneration } from './lib/ai/islandBatchRegen';
import { AiError } from './lib/ai/errors';
import {
  generateFullCharacter,
  generateMissingIslandNicknamesBatched,
  generateOneNickname,
  generateOnePhrase,
  generateLevelUpRewards,
  generateInteractionTopic,
  generateMissingInteractionTopics,
} from './lib/ai/generate';
import {
  buildOneDefaultNicknamePrompt,
  buildOnePhrasePrompt,
} from './lib/gemini/prompts';
import { generateQuickFillCharacter } from './lib/localGeneration';
import {
  allNewRegenerateChoices,
  buildRegeneratedCharacterContent,
} from './lib/characterRegeneration';
import {
  countMissingNicknamePairs,
  getMissingNicknamePairs,
} from './lib/missingNicknames';
import type { FullCharacterGeneration } from './lib/gemini/types';
import type { Character, PhraseType } from './types';
import { downloadIslandJson, parseIslandJson } from './lib/islandJson';
import { MAX_NICKNAME_OPTIONS, MAX_PHRASES_PER_TYPE } from './constants';
import { aiSuccessMessage } from './lib/aiGenerationMessages';

type View = 'main' | 'config' | 'tos';

type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Pause between sequential island regen API calls to reduce rate-limit errors. */
const ISLAND_REGEN_DELAY_MS = 1500;
const ISLAND_REGEN_BATCH_FAILURE_ID = '__batch__';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AppMain() {
  const { preference: themePreference, setPreference: setThemePreference } =
    useTheme();
  const [view, setView] = useState<View>('main');
  const [showNewCharModal, setShowNewCharModal] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<AiNotice | null>(null);
  const [gridSort, setGridSortState] = useState<GridSort>(getGridSort);
  const [islandersNickOpen, setIslandersNickOpenState] = useState(
    getIslandersNickOpen,
  );
  const [nicknameFilterFromId, setNicknameFilterFromId] = useState<string | null>(
    null,
  );
  const [socialRewardsOpen, setSocialRewardsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    data: import('./types').DictionaryData;
    suggestedName: string;
  } | null>(null);

  const [newCharReview, setNewCharReview] = useState<{
    name: string;
    extra?: string;
    generation: FullCharacterGeneration;
    source: 'quickFill' | 'canonAi';
  } | null>(null);
  const [newCharReviewKey, setNewCharReviewKey] = useState(0);
  const [regenReview, setRegenReview] = useState<{
    snapshot: Character;
    generation: FullCharacterGeneration;
  } | null>(null);
  const [regenReviewKey, setRegenReviewKey] = useState(0);
  const [islandRegen, setIslandRegen] = useState<IslandRegenProgress | null>(
    null,
  );
  const [islandRegenModalOpen, setIslandRegenModalOpen] = useState(false);
  const [islandRegenOptionsOpen, setIslandRegenOptionsOpen] = useState(false);
  const [aiLogsOpen, setAiLogsOpen] = useState(false);
  const islandRegenAbortRef = useRef<AbortController | null>(null);
  const islandRegenRunIdRef = useRef(0);

  const {
    characters,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    saveError,
    islands,
    activeIslandId,
    activeIslandName,
    switchIsland,
    createIsland,
    renameActiveIsland,
    replaceActiveIsland,
    importAsNewIsland,
    addCharacter,
    addCharacterFull,
    applyRegeneratedContent,
    removeCharacter,
    updateCharacterName,
    updateCharacterExtra,
    updateCharacterAvatar,
    updatePhrase,
    addPhrase,
    removePhrase,
    updateOutgoingNicknameAt,
    addOutgoingNicknameForTarget,
    updateNicknameAt,
    addNicknameForTarget,
    removeNicknameAt,
    updateNicknameDefaultAt,
    addNicknameDefault,
    removeNicknameDefault,
    updateLevelUpRewards,
    updateInteractionTopic,
    clearAllData,
  } = useDictionary();

  const { apiKey, setApiKey, hasApiKey } = useSettings();

  const sidebarCharacters = useMemo(
    () => sortCharacters(characters, 'name'),
    [characters],
  );

  const handleSelectCharacter = useCallback(
    (id: string | null) => {
      setNicknameFilterFromId(null);
      setSelectedId(id);
    },
    [setSelectedId],
  );

  const handleOpenFromNicknames = useCallback(
    (toId: string) => {
      if (selectedId) setNicknameFilterFromId(selectedId);
      setSelectedId(toId);
    },
    [selectedId, setSelectedId],
  );

  const openView = useCallback((next: View) => {
    setView(next);
  }, []);

  const handleGridSortChange = (sort: GridSort) => {
    setGridSortState(sort);
    setGridSort(sort);
  };

  const handleIslandersNickOpenChange = (open: boolean) => {
    setIslandersNickOpenState(open);
    setIslandersNickOpen(open);
  };

  const handleExportJson = () => {
    downloadIslandJson({ version: 1, characters });
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseIslandJson(text);
      const baseName = file.name.replace(/\.json$/i, '') || 'Imported island';
      setPendingImport({ data, suggestedName: baseName });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const executeAi = useCallback(
    async <T,>(
      key: string,
      fn: () => Promise<T>,
      options?: { quiet?: boolean; signal?: AbortSignal },
    ): Promise<AiResult<T>> => {
      if (!hasApiKey) {
        return { ok: false, error: 'No API key configured' };
      }
      if (options?.signal?.aborted) {
        return { ok: false, error: 'Generation cancelled' };
      }
      setGeneratingKey(key);
      if (!options?.quiet) setAiNotice(null);
      try {
        const value = await fn();
        if (options?.signal?.aborted) {
          return { ok: false, error: 'Generation cancelled' };
        }
        if (!options?.quiet) {
          const successMsg = aiSuccessMessage(key, value);
          if (successMsg) setAiNotice({ kind: 'success', message: successMsg });
        }
        return { ok: true, value };
      } catch (e) {
        const cancelled =
          options?.signal?.aborted ||
          (e instanceof AiError && e.message === 'Generation cancelled') ||
          (e instanceof DOMException && e.name === 'AbortError') ||
          (e instanceof Error && e.name === 'AbortError');
        if (cancelled) {
          return { ok: false, error: 'Generation cancelled' };
        }
        const msg =
          e instanceof AiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Generation failed';
        if (!msg.includes('Unsupported site')) {
          console.error('[AI]', key, msg, e);
        } else {
          console.warn('[AI]', key, msg);
        }
        if (!options?.quiet) setAiNotice({ kind: 'error', message: msg });
        return { ok: false, error: msg };
      } finally {
        setGeneratingKey(null);
      }
    },
    [hasApiKey],
  );

  const runAi = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
      const result = await executeAi(key, fn);
      return result.ok ? result.value : null;
    },
    [executeAi],
  );

  const handleQuickFill = useCallback(
    (name: string, extra?: string) => {
      setShowNewCharModal(false);
      const generation = generateQuickFillCharacter(name, extra, characters);
      setNewCharReview({ name, extra, generation, source: 'quickFill' });
      setNewCharReviewKey((k) => k + 1);
      setAiNotice({
        kind: 'success',
        message: 'Quick fill ready — review and add',
      });
    },
    [characters],
  );

  const handleCanonAiNewCharacter = useCallback(
    async (name: string, extra?: string) => {
      setShowNewCharModal(false);
      const generation = await runAi('newchar', () =>
        generateFullCharacter(apiKey, name, characters, extra),
      );
      if (generation) {
        setNewCharReview({ name, extra, generation, source: 'canonAi' });
        setNewCharReviewKey((k) => k + 1);
      }
    },
    [apiKey, characters, runAi],
  );

  const handleRegenerateNewCharacter = useCallback(async () => {
    if (!newCharReview) return;
    const { name, extra, source } = newCharReview;

    if (source === 'canonAi') {
      const generation = await runAi('newchar', () =>
        generateFullCharacter(apiKey, name, characters, extra),
      );
      if (generation) {
        setNewCharReview({ name, extra, generation, source: 'canonAi' });
        setNewCharReviewKey((k) => k + 1);
      }
      return;
    }

    const generation = generateQuickFillCharacter(name, extra, characters);
    setNewCharReview({ name, extra, generation, source: 'quickFill' });
    setNewCharReviewKey((k) => k + 1);
    setAiNotice({
      kind: 'success',
      message: 'Quick fill ready — review and add',
    });
  }, [apiKey, characters, newCharReview, runAi]);

  const handleRegenerateExistingCharacter = useCallback(async () => {
    if (!selected || !hasApiKey) return;
    const cast = characters.filter((c) => c.id !== selected.id);
    const generation = await runAi('regen-char', () =>
      generateFullCharacter(apiKey, selected.name, cast, selected.extra),
    );
    if (!generation) return;
    setRegenReview({
      snapshot: selected,
      generation,
    });
    setRegenReviewKey((k) => k + 1);
  }, [apiKey, characters, hasApiKey, runAi, selected]);

  const runIslandRegeneration = useCallback(
    async (targets: Character[], mode: IslandRegenMode) => {
      if (targets.length === 0) return;

      const runId = ++islandRegenRunIdRef.current;
      const abortController = new AbortController();
      islandRegenAbortRef.current = abortController;
      const signal = abortController.signal;

      const isActive = () =>
        islandRegenRunIdRef.current === runId && !signal.aborted;

      const pushProgress = (next: IslandRegenProgress) => {
        if (islandRegenRunIdRef.current !== runId) return;
        setIslandRegen(next);
      };

      pushProgress({
        mode,
        phase: 'running',
        index: 0,
        total: targets.length,
        currentName: targets[0].name,
        succeeded: [],
        failed: [],
      });
      setIslandRegenModalOpen(true);

      if (mode === 'batch') {
        pushProgress({
          mode,
          phase: 'running',
          index: 0,
          total: 1,
          islanderCount: targets.length,
          currentName: `${targets.length} islander${targets.length === 1 ? '' : 's'}`,
          succeeded: [],
          failed: [],
        });

        const result = await executeAi(
          'regen-island-batch',
          () => generateIslandBatchRegeneration(apiKey, targets, { signal }),
          { quiet: true, signal },
        );

        if (!isActive()) {
          pushProgress({
            mode,
            phase: 'stopped',
            index: 0,
            total: 1,
            islanderCount: targets.length,
            currentName: `${targets.length} islander${targets.length === 1 ? '' : 's'}`,
            succeeded: [],
            failed: [],
          });
          return;
        }

        if (result.ok) {
          try {
            replaceActiveIsland({ version: 1, characters: result.value });
            pushProgress({
              mode,
              phase: 'done',
              index: 0,
              total: 1,
              islanderCount: targets.length,
              currentName: `${targets.length} islander${targets.length === 1 ? '' : 's'}`,
              succeeded: targets.map((c) => c.name),
              failed: [],
            });
            setAiNotice({
              kind: 'success',
              message: `Regenerated ${targets.length} islander${targets.length === 1 ? '' : 's'}`,
            });
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : 'Failed to save regenerated island';
            pushProgress({
              mode,
              phase: 'done',
              index: 0,
              total: 1,
              islanderCount: targets.length,
              currentName: `${targets.length} islander${targets.length === 1 ? '' : 's'}`,
              succeeded: [],
              failed: [
                {
                  characterId: ISLAND_REGEN_BATCH_FAILURE_ID,
                  characterName: 'All islanders (batch)',
                  error: msg,
                },
              ],
            });
          }
        } else {
          pushProgress({
            mode,
            phase: result.error === 'Generation cancelled' ? 'stopped' : 'done',
            index: 0,
            total: 1,
            islanderCount: targets.length,
            currentName: `${targets.length} islander${targets.length === 1 ? '' : 's'}`,
            succeeded: [],
            failed:
              result.error === 'Generation cancelled'
                ? []
                : [
                    {
                      characterId: ISLAND_REGEN_BATCH_FAILURE_ID,
                      characterName: 'All islanders (batch)',
                      error: result.error,
                    },
                  ],
          });
        }
        return;
      }

      const succeeded: string[] = [];
      const failed: IslandRegenProgress['failed'] = [];

      for (let i = 0; i < targets.length; i++) {
        if (!isActive()) {
          pushProgress({
            mode,
            phase: 'stopped',
            index: i,
            total: targets.length,
            currentName: targets[i]?.name ?? '',
            succeeded: [...succeeded],
            failed: [...failed],
          });
          return;
        }

        const character = targets[i];
        pushProgress({
          mode,
          phase: 'running',
          index: i,
          total: targets.length,
          currentName: character.name,
          succeeded: [...succeeded],
          failed: [...failed],
        });

        const cast = characters.filter((c) => c.id !== character.id);
        const result = await executeAi(
          `regen-island-${character.id}`,
          () =>
            generateFullCharacter(
              apiKey,
              character.name,
              cast,
              character.extra,
              { signal },
            ),
          { quiet: true, signal },
        );

        if (!isActive()) {
          pushProgress({
            mode,
            phase: 'stopped',
            index: i,
            total: targets.length,
            currentName: character.name,
            succeeded: [...succeeded],
            failed: [...failed],
          });
          return;
        }

        if (result.ok) {
          const choices = allNewRegenerateChoices(
            character,
            characters,
            result.value,
          );
          const patch = buildRegeneratedCharacterContent(
            character,
            result.value,
            characters,
            choices,
          );
          applyRegeneratedContent(character.id, patch);
          succeeded.push(character.name);
        } else if (result.error !== 'Generation cancelled') {
          failed.push({
            characterId: character.id,
            characterName: character.name,
            error: result.error,
          });
        } else {
          pushProgress({
            mode,
            phase: 'stopped',
            index: i,
            total: targets.length,
            currentName: character.name,
            succeeded: [...succeeded],
            failed: [...failed],
          });
          return;
        }

        if (i < targets.length - 1 && isActive()) {
          await sleep(ISLAND_REGEN_DELAY_MS);
        }
      }

      if (!isActive()) return;

      pushProgress({
        mode,
        phase: 'done',
        index: targets.length - 1,
        total: targets.length,
        currentName: targets[targets.length - 1]?.name ?? '',
        succeeded: [...succeeded],
        failed: [...failed],
      });

      if (failed.length === 0 && succeeded.length > 0) {
        setAiNotice({
          kind: 'success',
          message: `Regenerated ${succeeded.length} islander${succeeded.length === 1 ? '' : 's'}`,
        });
      }
    },
    [
      apiKey,
      applyRegeneratedContent,
      characters,
      executeAi,
      replaceActiveIsland,
    ],
  );

  const handleOpenIslandRegenOptions = useCallback(() => {
    if (!hasApiKey || characters.length === 0) return;
    setIslandRegenOptionsOpen(true);
  }, [characters.length, hasApiKey]);

  const handleStartIslandRegeneration = useCallback(
    (mode: IslandRegenMode) => {
      setIslandRegenOptionsOpen(false);
      void runIslandRegeneration(characters, mode);
    },
    [characters, runIslandRegeneration],
  );

  const handleStopIslandRegeneration = useCallback(() => {
    islandRegenAbortRef.current?.abort();
  }, []);

  const handleRetryFailedIslandRegeneration = useCallback(() => {
    if (!islandRegen?.failed.length) return;
    if (
      islandRegen.mode === 'batch' ||
      islandRegen.failed.some((f) => f.characterId === ISLAND_REGEN_BATCH_FAILURE_ID)
    ) {
      void runIslandRegeneration(characters, 'batch');
      return;
    }
    const failedIds = new Set(islandRegen.failed.map((f) => f.characterId));
    const toRetry = characters.filter((c) => failedIds.has(c.id));
    void runIslandRegeneration(toRetry, 'sequential');
  }, [characters, islandRegen, runIslandRegeneration]);

  const handleHideIslandRegenerationModal = useCallback(() => {
    setIslandRegenModalOpen(false);
    if (islandRegen?.phase !== 'running') {
      setIslandRegen(null);
    }
  }, [islandRegen?.phase]);

  const islandRegenBanner = useMemo(() => {
    if (!islandRegen || islandRegenModalOpen) return null;
    const processed = islandRegen.succeeded.length + islandRegen.failed.length;
    if (islandRegen.phase === 'running') {
      if (islandRegen.mode === 'batch') {
        const n = islandRegen.islanderCount ?? processed;
        return {
          label: `Island batch regeneration in progress (1 request · ${n} islander${n === 1 ? '' : 's'})…`,
          onShow: () => setIslandRegenModalOpen(true),
        };
      }
      return {
        label: `Island regeneration in progress (${processed}/${islandRegen.total})…`,
        onShow: () => setIslandRegenModalOpen(true),
      };
    }
    if (islandRegen.failed.length > 0) {
      return {
        label: `Island regeneration finished with ${islandRegen.failed.length} failure(s)`,
        onShow: () => setIslandRegenModalOpen(true),
      };
    }
    return {
      label: 'Island regeneration complete',
      onShow: () => setIslandRegenModalOpen(true),
    };
  }, [islandRegen, islandRegenModalOpen]);

  const handleConfirmRegenerateReview = useCallback(
    (patch: {
      phrases: Character['phrases'];
      nicknameDefaults: string[];
      nicknames: Record<string, string[]>;
      levelUpRewards?: Character['levelUpRewards'];
      interactionTopics?: Character['interactionTopics'];
    }) => {
      if (!regenReview) return;
      applyRegeneratedContent(regenReview.snapshot.id, patch);
      setRegenReview(null);
      setAiNotice({
        kind: 'success',
        message: 'Character updated with selected lines',
      });
    },
    [applyRegeneratedContent, regenReview],
  );

  const handleGenerateLevelUpRewards = useCallback(async () => {
    if (!selected) return;
    const rewards = await runAi('rewards', () =>
      generateLevelUpRewards(apiKey, selected),
    );
    if (rewards) {
      updateLevelUpRewards(selected.id, rewards);
    }
  }, [apiKey, runAi, selected, updateLevelUpRewards]);

  const handleGenerateInteractionTopic = useCallback(
    async (targetId: string) => {
      if (!selected) return;
      const target = characters.find((c) => c.id === targetId);
      if (!target) return;
      const topic = await runAi(`topic-${targetId}`, () =>
        generateInteractionTopic(apiKey, selected, target),
      );
      if (topic) {
        updateInteractionTopic(
          selected.id,
          targetId,
          topic.text,
          topic.kind,
        );
      }
    },
    [apiKey, characters, runAi, selected, updateInteractionTopic],
  );

  const handleGenerateAllInteractionTopics = useCallback(async () => {
    if (!selected) return;
    const targets = characters.filter((c) => c.id !== selected.id);
    if (targets.length === 0) {
      setAiNotice({
        kind: 'success',
        message: 'Add more islanders to generate conversation topics',
      });
      return;
    }
    const topics = await runAi('all-topics', () =>
      generateMissingInteractionTopics(apiKey, selected, targets),
    );
    if (topics) {
      let added = 0;
      const nameToId = new Map(characters.map((c) => [c.name, c.id]));
      for (const [targetName, topicVal] of Object.entries(topics)) {
        const id = nameToId.get(targetName);
        if (id && topicVal.text.trim()) {
          updateInteractionTopic(
            selected.id,
            id,
            topicVal.text,
            topicVal.kind,
          );
          added++;
        }
      }
      if (added > 0) {
        setAiNotice({
          kind: 'success',
          message: `Updated ${added} conversation topic${added === 1 ? '' : 's'}`,
        });
      }
    }
  }, [apiKey, characters, runAi, selected, updateInteractionTopic]);

  const handleGeneratePhrase = useCallback(
    async (type: PhraseType) => {
      if (!selected) return;
      if (selected.phrases[type].length >= MAX_PHRASES_PER_TYPE) return;
      const line = await runAi(`phrase:${type}`, () =>
        generateOnePhrase(
          apiKey,
          buildOnePhrasePrompt(selected, characters, type),
          type,
        ),
      );
      if (line) addPhrase(selected.id, type, line);
    },
    [addPhrase, apiKey, characters, runAi, selected],
  );

  const handleGenerateDefaultNickname = useCallback(async () => {
    if (!selected) return;
    if (selected.nicknameDefaults.length >= MAX_NICKNAME_OPTIONS) return;
    const nick = await runAi('nick:default', () =>
      generateOneNickname(
        apiKey,
        buildOneDefaultNicknamePrompt(selected, characters),
        true,
      ),
    );
    if (nick) addNicknameDefault(selected.id, nick);
  }, [addNicknameDefault, apiKey, characters, runAi, selected]);

  const handleConfirmNewCharacter = useCallback(
    (result: {
      character: import('./types').Character;
      incomingBySpeakerId: Record<string, string[]>;
    }) => {
      addCharacterFull(result.character, result.incomingBySpeakerId);
      setNewCharReview(null);
      handleSelectCharacter(result.character.id);
    },
    [addCharacterFull, handleSelectCharacter],
  );

  const handleGenerateMissingNicknames = useCallback(async () => {
    if (!selected) return;
    const missing = getMissingNicknamePairs(selected, characters);
    if (countMissingNicknamePairs(missing) === 0) {
      setAiNotice({
        kind: 'success',
        message: 'All islander nicknames are already set',
      });
      return;
    }
    const generated = await runAi('nick:missing', () =>
      generateMissingIslandNicknamesBatched(
        apiKey,
        selected,
        characters,
        missing,
      ),
    );
    if (!generated) return;

    const nameToId = new Map(characters.map((c) => [c.name, c.id]));
    let added = 0;

    for (const [name, nick] of Object.entries(generated.outgoing)) {
      const targetId = nameToId.get(name);
      if (!targetId || !nick.trim()) continue;
      if ((selected.nicknames[targetId] ?? []).some((v) => v.trim())) continue;
      addOutgoingNicknameForTarget(selected.id, targetId, nick);
      added += 1;
    }

    for (const [name, nick] of Object.entries(generated.incoming)) {
      const speakerId = nameToId.get(name);
      if (!speakerId || !nick.trim()) continue;
      const speaker = characters.find((c) => c.id === speakerId);
      if ((speaker?.nicknames[selected.id] ?? []).some((v) => v.trim())) continue;
      addNicknameForTarget(speakerId, selected.id, nick);
      added += 1;
    }

    if (added > 0) {
      setAiNotice({
        kind: 'success',
        message: `Added ${added} nickname${added === 1 ? '' : 's'}`,
      });
    }
  }, [
    addNicknameForTarget,
    addOutgoingNicknameForTarget,
    apiKey,
    characters,
    runAi,
    selected,
  ]);

  const handleDeleteCharacter = useCallback(() => {
    if (!selected) return;
    removeCharacter(selected.id);
    setSelectedId(null);
  }, [removeCharacter, selected, setSelectedId]);

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading island dialogue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-loading app-error">
        <p>{error}</p>
      </div>
    );
  }

  if (view === 'config') {
    return (
      <ConfigPage
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        themePreference={themePreference}
        onThemePreferenceChange={setThemePreference}
        onClearAllData={clearAllData}
        onBack={() => openView('main')}
      />
    );
  }

  if (view === 'tos') {
    return <TosPage onBack={() => openView('main')} />;
  }

  return (
    <div className="app">
      <Sidebar
        characters={sidebarCharacters}
        selectedId={selectedId}
        onSelect={handleSelectCharacter}
        onAdd={() => setShowNewCharModal(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenLogs={() => setAiLogsOpen(true)}
        onOpenConfig={() => openView('config')}
        onOpenTos={() => openView('tos')}
        hasApiKey={hasApiKey}
        islands={islands}
        activeIslandId={activeIslandId}
        activeIslandName={activeIslandName}
        onSwitchIsland={switchIsland}
        onCreateIsland={() => createIsland()}
        onRenameIsland={renameActiveIsland}
        onRegenerateIsland={handleOpenIslandRegenOptions}
        regeneratingIsland={islandRegen?.phase === 'running'}
      />
      <div className="main-area">
        <div className="main-area-body">
          {selected ? (
            <CharacterEditor
              character={selected}
              allCharacters={characters}
              onBack={() => handleSelectCharacter(null)}
              nicknameFocusCharacterId={nicknameFilterFromId}
              onNameChange={(name) => updateCharacterName(selected.id, name)}
              onExtraChange={(extra) =>
                updateCharacterExtra(selected.id, extra)
              }
              onAvatarChange={(avatar) =>
                updateCharacterAvatar(selected.id, avatar)
              }
              onDelete={handleDeleteCharacter}
              onUpdatePhrase={(type, index, text) =>
                updatePhrase(selected.id, type, index, text)
              }
              onAddPhrase={(type, text) => addPhrase(selected.id, type, text)}
              onRemovePhrase={(type, index) =>
                removePhrase(selected.id, type, index)
              }
              hasApiKey={hasApiKey}
              generatingKey={generatingKey}
              onUpdateNicknameDefaultAt={(index, value) =>
                updateNicknameDefaultAt(selected.id, index, value)
              }
              onAddNicknameDefault={(value) =>
                addNicknameDefault(selected.id, value)
              }
              onRemoveNicknameDefault={(index) =>
                removeNicknameDefault(selected.id, index)
              }
              onUpdateNicknameAt={(targetId, index, value) =>
                updateOutgoingNicknameAt(selected.id, targetId, index, value)
              }
              onAddNickname={(targetId, value) =>
                addOutgoingNicknameForTarget(selected.id, targetId, value)
              }
              onRemoveNickname={(targetId, index) =>
                removeNicknameAt(selected.id, targetId, index)
              }
              onUpdateIncomingAt={(speakerId, index, value) =>
                updateNicknameAt(speakerId, selected.id, index, value)
              }
              onAddIncoming={(speakerId, value) =>
                addNicknameForTarget(speakerId, selected.id, value)
              }
              onRemoveIncoming={(speakerId, index) =>
                removeNicknameAt(speakerId, selected.id, index)
              }
              onGeneratePhrase={handleGeneratePhrase}
              onGenerateDefaultNickname={handleGenerateDefaultNickname}
              onGenerateMissingNicknames={handleGenerateMissingNicknames}
              onRegenerateAll={handleRegenerateExistingCharacter}
              onOpenCharacter={handleOpenFromNicknames}
              islandersNickOpen={islandersNickOpen}
              onIslandersNickOpenChange={handleIslandersNickOpenChange}
              socialRewardsOpen={socialRewardsOpen}
              onSocialRewardsOpenChange={setSocialRewardsOpen}
              onUpdateLevelUpRewards={(rewards) =>
                updateLevelUpRewards(selected.id, rewards)
              }
              onUpdateInteractionTopic={(targetId, text, kind) =>
                updateInteractionTopic(selected.id, targetId, text, kind)
              }
              onGenerateLevelUpRewards={handleGenerateLevelUpRewards}
              onGenerateInteractionTopic={handleGenerateInteractionTopic}
              onGenerateAllInteractionTopics={handleGenerateAllInteractionTopics}
            />
          ) : (
            <CharacterGrid
              characters={characters}
              sort={gridSort}
              onSortChange={handleGridSortChange}
              onSelect={handleSelectCharacter}
              onAdd={() => setShowNewCharModal(true)}
            />
          )}
        </div>
      </div>

      {showNewCharModal && (
        <NewCharacterModal
          hasApiKey={hasApiKey}
          onClose={() => setShowNewCharModal(false)}
          onAddPlain={(name, extra) => {
            const c = addCharacter(name, extra);
            setShowNewCharModal(false);
            if (c) handleSelectCharacter(c.id);
          }}
          onQuickFill={handleQuickFill}
          onCanonAi={handleCanonAiNewCharacter}
        />
      )}

      <AiGenerationStatus
        busy={generatingKey !== null && !islandRegenBanner}
        notice={saveError ? { kind: 'error', message: saveError } : aiNotice}
        islandRegenBanner={islandRegenBanner}
        onDismissNotice={() => setAiNotice(null)}
      />

      {newCharReview && (
        <NewCharacterReviewModal
          key={newCharReviewKey}
          name={newCharReview.name}
          extra={newCharReview.extra}
          generation={newCharReview.generation}
          existingCharacters={characters}
          regenerating={generatingKey === 'newchar'}
          onRegenerate={handleRegenerateNewCharacter}
          onConfirm={handleConfirmNewCharacter}
          onClose={() => setNewCharReview(null)}
        />
      )}

      {regenReview && (
        <CharacterRegenerateReviewModal
          key={regenReviewKey}
          character={regenReview.snapshot}
          generation={regenReview.generation}
          allCharacters={characters}
          regenerating={generatingKey === 'regen-char'}
          onRegenerate={handleRegenerateExistingCharacter}
          onConfirm={handleConfirmRegenerateReview}
          onClose={() => setRegenReview(null)}
        />
      )}

      {islandRegenOptionsOpen && (
        <IslandRegenerateOptionsModal
          characterCount={characters.length}
          onStart={handleStartIslandRegeneration}
          onCancel={() => setIslandRegenOptionsOpen(false)}
        />
      )}

      {islandRegen && islandRegenModalOpen && (
        <IslandRegenerateModal
          progress={islandRegen}
          onStop={handleStopIslandRegeneration}
          onRetryFailed={handleRetryFailedIslandRegeneration}
          onHide={handleHideIslandRegenerationModal}
        />
      )}

      {aiLogsOpen && <AiLogsModal onClose={() => setAiLogsOpen(false)} />}

      {pendingImport && (
        <ImportIslandModal
          characterCount={pendingImport.data.characters.length}
          onReplace={() => {
            replaceActiveIsland(pendingImport.data);
            setPendingImport(null);
          }}
          onAddNew={() => {
            importAsNewIsland(pendingImport.suggestedName, pendingImport.data);
            setPendingImport(null);
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  );
}
