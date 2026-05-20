import { useCallback, useMemo, useState } from 'react';
import {
  getGridSort,
  getIncomingNickOpen,
  getOutgoingNickOpen,
  setGridSort,
  setIncomingNickOpen,
  setOutgoingNickOpen,
  type GridSort,
} from './lib/uiPrefs';
import { sortCharacters } from './lib/sortCharacters';
import { useDictionary } from './hooks/useDictionary';
import { useSettings } from './hooks/useSettings';
import { Sidebar } from './components/Sidebar';
import { CharacterEditor } from './components/CharacterEditor';
import { CharacterGrid } from './components/CharacterGrid';
import { ConfigPage } from './components/ConfigPage';
import { TosPage } from './components/TosPage';
import { SyncBanner } from './components/SyncBanner';
import { NewCharacterModal } from './components/NewCharacterModal';
import { NewCharacterReviewModal } from './components/NewCharacterReviewModal';
import { GeminiError } from './lib/gemini/client';
import {
  buildFullCharacterPrompt,
  buildOneDefaultNicknamePrompt,
  buildOneIncomingNicknamePrompt,
  buildOnePhrasePrompt,
  buildOneTargetNicknamePrompt,
} from './lib/gemini/prompts';
import {
  generateFullCharacter,
  generateOneNickname,
  generateOnePhrase,
} from './lib/gemini/client';
import type { FullCharacterGeneration } from './lib/gemini/types';
import type { PhraseType } from './types';
import type { AuthMode } from './components/AuthScreen';
import { emailToDisplayUsername } from './lib/authUsername';
import { MAX_NICKNAME_OPTIONS, MAX_PHRASES_PER_TYPE } from './constants';

type View = 'main' | 'config' | 'tos';

interface AppMainProps {
  storageMode: 'local' | 'cloud';
  userId?: string | null;
  userEmail?: string;
  syncAvailable: boolean;
  onSignOut: () => void;
  onOpenAuth: (mode: AuthMode) => void;
}

export function AppMain({
  storageMode,
  userId,
  userEmail,
  syncAvailable,
  onSignOut,
  onOpenAuth,
}: AppMainProps) {
  const { apiKey, setApiKey, hasApiKey } = useSettings();
  const [view, setView] = useState<View>('main');
  const [showNewCharModal, setShowNewCharModal] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [gridSort, setGridSortState] = useState<GridSort>(getGridSort);
  const [outgoingNickOpen, setOutgoingNickOpenState] = useState(
    getOutgoingNickOpen,
  );
  const [incomingNickOpen, setIncomingNickOpenState] = useState(
    getIncomingNickOpen,
  );

  const [newCharReview, setNewCharReview] = useState<{
    name: string;
    generation: FullCharacterGeneration;
  } | null>(null);

  const {
    characters,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    syncStatus,
    syncError,
    addCharacter,
    addCharacterFull,
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
    seedsAvailable,
  } = useDictionary({ storageMode, userId });

  const displayUser = emailToDisplayUsername(userEmail);

  const sidebarCharacters = useMemo(
    () => sortCharacters(characters, 'name'),
    [characters],
  );

  const handleGridSortChange = (sort: GridSort) => {
    setGridSortState(sort);
    setGridSort(sort);
  };

  const handleOutgoingNickOpenChange = (open: boolean) => {
    setOutgoingNickOpenState(open);
    setOutgoingNickOpen(open);
  };

  const handleIncomingNickOpenChange = (open: boolean) => {
    setIncomingNickOpenState(open);
    setIncomingNickOpen(open);
  };

  const runAi = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
      if (!hasApiKey) return null;
      setGeneratingKey(key);
      setGenError(null);
      try {
        return await fn();
      } catch (e) {
        const msg =
          e instanceof GeminiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Generation failed';
        setGenError(msg);
        return null;
      } finally {
        setGeneratingKey(null);
      }
    },
    [hasApiKey],
  );

  const handleAddWithGeneration = useCallback(
    async (name: string) => {
      setShowNewCharModal(false);
      const generation = await runAi('newchar', () =>
        generateFullCharacter(
          apiKey,
          buildFullCharacterPrompt(name, characters),
        ),
      );
      if (generation) {
        setNewCharReview({ name, generation });
      }
    },
    [apiKey, characters, runAi],
  );

  const handleConfirmNewCharacter = useCallback(
    (result: {
      character: import('./types').Character;
      incomingBySpeakerId: Record<string, string[]>;
    }) => {
      addCharacterFull(result.character, result.incomingBySpeakerId);
      setNewCharReview(null);
      setSelectedId(result.character.id);
    },
    [addCharacterFull, setSelectedId],
  );

  const handleGeneratePhrase = useCallback(
    async (type: PhraseType) => {
      if (!selected) return;
      if (selected.phrases[type].length >= MAX_PHRASES_PER_TYPE) return;
      const line = await runAi(`phrase:${type}`, () =>
        generateOnePhrase(
          apiKey,
          buildOnePhrasePrompt(selected, characters, type),
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
      ),
    );
    if (nick) addNicknameDefault(selected.id, nick);
  }, [addNicknameDefault, apiKey, characters, runAi, selected]);

  const handleGenerateOutgoingNickname = useCallback(
    async (targetId: string) => {
      if (!selected) return;
      const target = characters.find((c) => c.id === targetId);
      if (!target) return;
      const current = selected.nicknames[targetId] ?? [];
      if (current.length >= MAX_NICKNAME_OPTIONS) return;
      const nick = await runAi(`nick:out:${targetId}`, () =>
        generateOneNickname(
          apiKey,
          buildOneTargetNicknamePrompt(selected, target, characters),
        ),
      );
      if (nick) addNicknameForTarget(selected.id, targetId, nick);
    },
    [addNicknameForTarget, apiKey, characters, runAi, selected],
  );

  const handleGenerateIncomingNickname = useCallback(
    async (speakerId: string) => {
      if (!selected) return;
      const speaker = characters.find((c) => c.id === speakerId);
      if (!speaker) return;
      const current = speaker.nicknames[selected.id] ?? [];
      if (current.length >= MAX_NICKNAME_OPTIONS) return;
      const nick = await runAi(`nick:in:${speakerId}`, () =>
        generateOneNickname(
          apiKey,
          buildOneIncomingNicknamePrompt(selected, speaker, characters),
        ),
      );
      if (nick) addNicknameForTarget(speakerId, selected.id, nick);
    },
    [addNicknameForTarget, apiKey, characters, runAi, selected],
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
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'tos') {
    return <TosPage onBack={() => setView('main')} />;
  }

  return (
    <div className="app">
      <Sidebar
        characters={sidebarCharacters}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={() => setShowNewCharModal(true)}
        onReset={resetFromSeed}
        onClearAll={clearAllData}
        onOpenConfig={() => setView('config')}
        onOpenTos={() => setView('tos')}
        hasApiKey={hasApiKey}
        seedsAvailable={seedsAvailable}
      />
      <div className="main-area">
        <SyncBanner
          mode={storageMode}
          displayName={displayUser}
          syncStatus={syncStatus}
          syncError={syncError}
          syncAvailable={syncAvailable}
          onCreateAccount={() => onOpenAuth('signUp')}
          onSignIn={() => onOpenAuth('signIn')}
          onSignOut={onSignOut}
        />
        {selected ? (
          <CharacterEditor
            character={selected}
            allCharacters={characters}
            onBack={() => setSelectedId(null)}
            onNameChange={(name) => updateCharacterName(selected.id, name)}
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
            genError={genError}
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
              updateNicknameAt(selected.id, targetId, index, value)
            }
            onAddNickname={(targetId, value) =>
              addNicknameForTarget(selected.id, targetId, value)
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
            onGenerateOutgoingNickname={handleGenerateOutgoingNickname}
            onGenerateIncomingNickname={handleGenerateIncomingNickname}
            onOpenCharacter={setSelectedId}
            outgoingNickOpen={outgoingNickOpen}
            incomingNickOpen={incomingNickOpen}
            onOutgoingNickOpenChange={handleOutgoingNickOpenChange}
            onIncomingNickOpenChange={handleIncomingNickOpenChange}
          />
        ) : (
          <CharacterGrid
            characters={characters}
            sort={gridSort}
            onSortChange={handleGridSortChange}
            onSelect={setSelectedId}
            onAdd={() => setShowNewCharModal(true)}
          />
        )}
      </div>

      {showNewCharModal && (
        <NewCharacterModal
          hasApiKey={hasApiKey}
          onClose={() => setShowNewCharModal(false)}
          onAddPlain={(name) => {
            const c = addCharacter(name);
            setShowNewCharModal(false);
            if (c) setSelectedId(c.id);
          }}
          onAddWithGeneration={handleAddWithGeneration}
        />
      )}

      {newCharReview && (
        <NewCharacterReviewModal
          name={newCharReview.name}
          generation={newCharReview.generation}
          existingCharacters={characters}
          onConfirm={handleConfirmNewCharacter}
          onClose={() => setNewCharReview(null)}
        />
      )}
    </div>
  );
}
