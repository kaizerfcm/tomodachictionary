import { useCallback, useState } from 'react';
import { useDictionary } from './hooks/useDictionary';
import { useSettings } from './hooks/useSettings';
import { Sidebar } from './components/Sidebar';
import { CharacterEditor } from './components/CharacterEditor';
import { ConfigPage } from './components/ConfigPage';
import { SyncBanner } from './components/SyncBanner';
import { NewCharacterModal } from './components/NewCharacterModal';
import { NewCharacterReviewModal } from './components/NewCharacterReviewModal';
import { PhrasesGenerationModal } from './components/PhrasesGenerationModal';
import { NicknamesGenerationModal } from './components/NicknamesGenerationModal';
import { GeminiError } from './lib/gemini/client';
import {
  buildFullCharacterPrompt,
  buildMorePhrasesPrompt,
  buildRegenerateNicknamesPrompt,
} from './lib/gemini/prompts';
import {
  generateFullCharacter,
  generateMorePhrases,
  regenerateNicknames,
} from './lib/gemini/client';
import type { FullCharacterGeneration } from './lib/gemini/types';
import type { GeneratedPhrases } from './lib/gemini/types';
import type { NicknameRegeneration } from './lib/gemini/types';
import type { PhraseType } from './types';
import type { AuthMode } from './components/AuthScreen';

type View = 'main' | 'config';

interface AppMainProps {
  storageMode: 'local' | 'cloud';
  userId?: string | null;
  userEmail?: string;
  syncAvailable: boolean;
  onSignOut: () => void;
  onOpenAuth: (mode: AuthMode, migrateHint?: boolean) => void;
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
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [newCharReview, setNewCharReview] = useState<{
    name: string;
    generation: FullCharacterGeneration;
  } | null>(null);

  const [phrasesReview, setPhrasesReview] = useState<{
    generation: GeneratedPhrases;
  } | null>(null);

  const [nicknamesReview, setNicknamesReview] = useState<{
    generation: NicknameRegeneration;
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
    appendPhrasesBatch,
    applyOutgoingNicknames,
    applyIncomingNicknames,
    removeCharacter,
    updateCharacterName,
    updatePhrase,
    addPhrase,
    removePhrase,
    updateNickname,
    updateNicknameDefault,
    resetFromSeed,
    clearAllData,
    seedsAvailable,
  } = useDictionary({ storageMode, userId });

  const runGeneration = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      if (!hasApiKey) return null;
      setGenerating(true);
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
        setGenerating(false);
      }
    },
    [hasApiKey],
  );

  const handleAddWithGeneration = useCallback(
    async (name: string) => {
      setShowNewCharModal(false);
      const generation = await runGeneration(() =>
        generateFullCharacter(
          apiKey,
          buildFullCharacterPrompt(name, characters),
        ),
      );
      if (generation) {
        setNewCharReview({ name, generation });
      }
    },
    [apiKey, characters, runGeneration],
  );

  const handleConfirmNewCharacter = useCallback(
    (result: {
      character: import('./types').Character;
      incomingBySpeakerId: Record<string, string>;
    }) => {
      addCharacterFull(result.character, result.incomingBySpeakerId);
      setNewCharReview(null);
    },
    [addCharacterFull],
  );

  const handleGeneratePhrases = useCallback(async () => {
    if (!selected) return;
    const generation = await runGeneration(() =>
      generateMorePhrases(
        apiKey,
        buildMorePhrasesPrompt(selected, characters),
      ),
    );
    if (generation) setPhrasesReview({ generation });
  }, [apiKey, characters, selected, runGeneration]);

  const handleConfirmPhrases = useCallback(
    (toAppend: Partial<Record<PhraseType, string[]>>) => {
      if (!selected) return;
      appendPhrasesBatch(selected.id, toAppend);
      setPhrasesReview(null);
    },
    [appendPhrasesBatch, selected],
  );

  const handleRegenerateNicknames = useCallback(async () => {
    if (!selected) return;
    const generation = await runGeneration(() =>
      regenerateNicknames(
        apiKey,
        buildRegenerateNicknamesPrompt(selected, characters),
      ),
    );
    if (generation) setNicknamesReview({ generation });
  }, [apiKey, characters, selected, runGeneration]);

  const handleConfirmNicknames = useCallback(
    (result: {
      nicknameDefault: string;
      outgoing: Record<string, string>;
      incomingBySpeakerId: Record<string, string>;
    }) => {
      if (!selected) return;
      applyOutgoingNicknames(
        selected.id,
        result.nicknameDefault,
        result.outgoing,
      );
      applyIncomingNicknames(selected.id, result.incomingBySpeakerId);
      setNicknamesReview(null);
    },
    [applyIncomingNicknames, applyOutgoingNicknames, selected],
  );

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

  return (
    <div className="app">
      <Sidebar
        characters={characters}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={() => setShowNewCharModal(true)}
        onReset={resetFromSeed}
        onClearAll={clearAllData}
        onOpenConfig={() => setView('config')}
        hasApiKey={hasApiKey}
        seedsAvailable={seedsAvailable}
      />
      <div className="main-area">
        <SyncBanner
          mode={storageMode}
          email={userEmail}
          syncStatus={syncStatus}
          syncError={syncError}
          syncAvailable={syncAvailable}
          onCreateAccount={() => onOpenAuth('signUp', true)}
          onSignIn={() => onOpenAuth('signIn')}
          onSignOut={onSignOut}
        />
        {generating && (
          <div className="gen-overlay">
            <p>Generating with Gemini…</p>
          </div>
        )}
        {selected ? (
          <CharacterEditor
            character={selected}
            allCharacters={characters}
            hasApiKey={hasApiKey}
            generating={generating}
            genError={genError}
            onNameChange={(name) => updateCharacterName(selected.id, name)}
            onDelete={() => removeCharacter(selected.id)}
            onUpdatePhrase={(type, index, text) =>
              updatePhrase(selected.id, type, index, text)
            }
            onAddPhrase={(type) => addPhrase(selected.id, type)}
            onRemovePhrase={(type, index) =>
              removePhrase(selected.id, type, index)
            }
            onUpdateNicknameDefault={(value) =>
              updateNicknameDefault(selected.id, value)
            }
            onUpdateNickname={(targetId, value) =>
              updateNickname(selected.id, targetId, value)
            }
            onGeneratePhrases={handleGeneratePhrases}
            onRegenerateNicknames={handleRegenerateNicknames}
          />
        ) : (
          <div className="empty-state">
            <p>Select a character from the list, or add a new one.</p>
          </div>
        )}
      </div>

      {showNewCharModal && (
        <NewCharacterModal
          hasApiKey={hasApiKey}
          onClose={() => setShowNewCharModal(false)}
          onAddPlain={(name) => {
            addCharacter(name);
            setShowNewCharModal(false);
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

      {phrasesReview && selected && (
        <PhrasesGenerationModal
          characterName={selected.name}
          generation={phrasesReview.generation}
          onConfirm={handleConfirmPhrases}
          onClose={() => setPhrasesReview(null)}
        />
      )}

      {nicknamesReview && selected && (
        <NicknamesGenerationModal
          character={selected}
          generation={nicknamesReview.generation}
          allCharacters={characters}
          onConfirm={handleConfirmNicknames}
          onClose={() => setNicknamesReview(null)}
        />
      )}
    </div>
  );
}
