import { useCallback, useMemo, useState } from 'react';
import {
  getGridSort,
  setGridSort,
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
import { ImportIslandModal } from './components/ImportIslandModal';
import {
  AiGenerationStatus,
  type AiNotice,
} from './components/AiGenerationStatus';
import { NewCharacterModal } from './components/NewCharacterModal';
import { NewCharacterReviewModal } from './components/NewCharacterReviewModal';
import { AiLogsModal } from './components/AiLogsModal';
import {
  generateAllCharacterNicknames,
  generateAllCharacterPhrases,
  generateFullCharacter,
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
  nicknamesFromOutgoing,
  phrasesFromGeneration,
} from './lib/characterRegeneration';
import type { FullCharacterGeneration } from './lib/gemini/types';
import type { PhraseType } from './types';
import { AiError } from './lib/ai/errors';
import { downloadIslandJson, parseIslandJson } from './lib/islandJson';
import { MAX_NICKNAME_OPTIONS, MAX_PHRASES_PER_TYPE } from './constants';
import { aiSuccessMessage } from './lib/aiGenerationMessages';

type View = 'main' | 'config';

type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function AppMain() {
  const { preference: themePreference, setPreference: setThemePreference } =
    useTheme();
  const [view, setView] = useState<View>('main');
  const [showNewCharModal, setShowNewCharModal] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<AiNotice | null>(null);
  const [gridSort, setGridSortState] = useState<GridSort>(getGridSort);
  const [nicknameFilterFromId, setNicknameFilterFromId] = useState<string | null>(
    null,
  );
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
  const [aiLogsOpen, setAiLogsOpen] = useState(false);

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

  const handleRegenerateAllPhrases = useCallback(async () => {
    if (!selected) return;
    const phrases = await runAi('phrases:all', () =>
      generateAllCharacterPhrases(apiKey, selected.name, selected.extra),
    );
    if (!phrases) return;
    applyRegeneratedContent(selected.id, {
      phrases: phrasesFromGeneration(phrases),
      nicknameDefaults: selected.nicknameDefaults,
      nicknames: selected.nicknames,
      levelUpRewards: selected.levelUpRewards,
      interactionTopics: selected.interactionTopics,
    });
    setAiNotice({ kind: 'success', message: 'Phrases regenerated' });
  }, [apiKey, applyRegeneratedContent, runAi, selected]);

  const handleRegenerateAllNicknames = useCallback(async () => {
    if (!selected) return;
    const cast = characters.filter((c) => c.id !== selected.id);
    const outgoing = await runAi('nicknames:all', () =>
      generateAllCharacterNicknames(
        apiKey,
        selected.name,
        cast,
        selected.extra,
      ),
    );
    if (!outgoing) return;
    const { nicknameDefaults, nicknames } = nicknamesFromOutgoing(
      outgoing,
      characters,
    );
    applyRegeneratedContent(selected.id, {
      phrases: selected.phrases,
      nicknameDefaults,
      nicknames,
      levelUpRewards: selected.levelUpRewards,
      interactionTopics: selected.interactionTopics,
    });
    setAiNotice({ kind: 'success', message: 'Nicknames regenerated' });
  }, [apiKey, applyRegeneratedContent, characters, runAi, selected]);

  const handleRegenerateAllGifts = useCallback(async () => {
    if (!selected) return;
    const rewards = await runAi('gifts:all', () =>
      generateLevelUpRewards(apiKey, selected),
    );
    if (rewards) {
      updateLevelUpRewards(selected.id, rewards);
      setAiNotice({ kind: 'success', message: 'Gifts regenerated' });
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

  const handleRegenerateAllTopics = useCallback(async () => {
    if (!selected) return;
    const targets = characters.filter((c) => c.id !== selected.id);
    if (targets.length === 0) {
      setAiNotice({
        kind: 'success',
        message: 'Add more islanders to generate conversation topics',
      });
      return;
    }
    const topics = await runAi('topics:all', () =>
      generateMissingInteractionTopics(apiKey, selected, targets),
    );
    if (!topics) return;
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
      }
    }
    setAiNotice({
      kind: 'success',
      message: 'Conversation topics regenerated',
    });
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
        hasApiKey={hasApiKey}
        islands={islands}
        activeIslandId={activeIslandId}
        activeIslandName={activeIslandName}
        onSwitchIsland={switchIsland}
        onCreateIsland={() => createIsland()}
        onRenameIsland={renameActiveIsland}
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
              onRegenerateAllPhrases={handleRegenerateAllPhrases}
              onGenerateDefaultNickname={handleGenerateDefaultNickname}
              onRegenerateAllNicknames={handleRegenerateAllNicknames}
              onOpenCharacter={handleOpenFromNicknames}
              onUpdateLevelUpRewards={(rewards) =>
                updateLevelUpRewards(selected.id, rewards)
              }
              onUpdateInteractionTopic={(targetId, text, kind) =>
                updateInteractionTopic(selected.id, targetId, text, kind)
              }
              onRegenerateAllGifts={handleRegenerateAllGifts}
              onRegenerateAllTopics={handleRegenerateAllTopics}
              onGenerateInteractionTopic={handleGenerateInteractionTopic}
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
        busy={generatingKey !== null}
        notice={saveError ? { kind: 'error', message: saveError } : aiNotice}
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
