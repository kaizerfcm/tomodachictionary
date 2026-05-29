import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useUserProfile } from './hooks/useUserProfile';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { CharacterEditor } from './components/CharacterEditor';
import { CharacterGrid } from './components/CharacterGrid';
import { ConfigPage } from './components/ConfigPage';
import { TosPage } from './components/TosPage';
import { RemoveAdsPage } from './components/RemoveAdsPage';
import { AdBanner } from './components/AdBanner';
import { useAdMobBanner } from './hooks/useAdMobBanner';
import { shouldUseNativeAds } from './lib/admobConfig';
import { SyncBanner } from './components/SyncBanner';
import {
  AiGenerationStatus,
  type AiNotice,
} from './components/AiGenerationStatus';
import { NewCharacterModal } from './components/NewCharacterModal';
import { NewCharacterReviewModal } from './components/NewCharacterReviewModal';
import { AiError } from './lib/ai/errors';
import {
  generateFullCharacter,
  generateMissingIslandNicknamesBatched,
  generateOneNickname,
  generateOnePhrase,
} from './lib/ai/generate';
import {
  buildOneDefaultNicknamePrompt,
  buildOnePhrasePrompt,
} from './lib/gemini/prompts';
import { generateQuickFillCharacter } from './lib/localGeneration';
import { canUseCommunityNicknames } from './lib/communityNicknames';
import {
  countMissingNicknamePairs,
  getMissingNicknamePairs,
} from './lib/missingNicknames';
import type { FullCharacterGeneration } from './lib/gemini/types';
import type { PhraseType } from './types';
import type { AuthMode } from './components/AuthScreen';
import { formatAccountLabel } from './lib/authEmail';
import { getPaymentConfig } from './lib/paymentConfig';
import { downloadIslandJson, parseIslandJson } from './lib/islandJson';
import { MAX_NICKNAME_OPTIONS, MAX_PHRASES_PER_TYPE } from './constants';
import { canUseCommunityPhrases } from './lib/communityPhrases';
import { aiSuccessMessage } from './lib/aiGenerationMessages';

type View = 'main' | 'config' | 'tos' | 'removeAds';

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
  const { preference: themePreference, setPreference: setThemePreference } =
    useTheme();
  const { adsRemoved, setAdsRemoved, refreshProfile, confirmPlayPurchase } =
    useUserProfile(userId);
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
  const prevSelectedId = useRef<string | null | undefined>(undefined);
  const prevView = useRef<View | undefined>(undefined);

  const [newCharReview, setNewCharReview] = useState<{
    name: string;
    extra?: string;
    generation: FullCharacterGeneration;
    source: 'quickFill' | 'canonAi';
  } | null>(null);
  const [newCharReviewKey, setNewCharReviewKey] = useState(0);

  const {
    characters,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    syncError,
    syncToCloud,
    addCharacter,
    addCharacterFull,
    applyCharacters,
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
    clearAllData,
  } = useDictionary({ storageMode, userId });

  const accountEmail = userEmail ? formatAccountLabel(userEmail) : undefined;
  const payment = getPaymentConfig();
  const signedIn = storageMode === 'cloud' && Boolean(userId);
  const { apiKey, setApiKey, hasApiKey } = useSettings();
  const communityPhrasesEnabled = canUseCommunityPhrases(signedIn);
  const communityNicknamesEnabled = canUseCommunityNicknames(signedIn);

  const sidebarCharacters = useMemo(
    () => sortCharacters(characters, 'name'),
    [characters],
  );

  const showGrid = !selected;
  const showAdBanner = showGrid && !adsRemoved;

  useAdMobBanner(showAdBanner);

  useEffect(() => {
    if (loading) return;
    if (
      prevSelectedId.current !== undefined &&
      prevSelectedId.current !== selectedId
    ) {
      void syncToCloud();
    }
    if (prevView.current !== undefined && prevView.current !== view) {
      void syncToCloud();
    }
    prevSelectedId.current = selectedId;
    prevView.current = view;
  }, [selectedId, view, loading, syncToCloud]);

  const handleSignOut = useCallback(async () => {
    await syncToCloud();
    await onSignOut();
  }, [onSignOut, syncToCloud]);

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

  const openView = useCallback(
    (next: View) => {
      setView(next);
    },
    [],
  );

  useEffect(() => {
    if (!showAdBanner) return;
    const onVisible = () => {
      void refreshProfile();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onVisible();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showAdBanner, refreshProfile]);

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
      const replace = window.confirm(
        `Import ${data.characters.length} character(s)? OK replaces your island; Cancel merges by name (keeps existing IDs where names match).`,
      );
      if (replace) {
        applyCharacters(data.characters);
        return;
      }
      const byName = new Map(characters.map((c) => [c.name.toLowerCase(), c]));
      const merged = [...characters];
      for (const imported of data.characters) {
        const key = imported.name.toLowerCase();
        const existing = byName.get(key);
        if (existing) {
          const idx = merged.findIndex((c) => c.id === existing.id);
          if (idx >= 0) merged[idx] = { ...imported, id: existing.id };
        } else {
          merged.push(imported);
        }
      }
      applyCharacters(merged);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const handleRemoveFree = async () => {
    await setAdsRemoved(true);
    openView('main');
  };

  const runAi = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
      if (!hasApiKey) return null;
      setGeneratingKey(key);
      setAiNotice(null);
      try {
        const result = await fn();
        const successMsg = aiSuccessMessage(key, result);
        if (successMsg) setAiNotice({ kind: 'success', message: successMsg });
        return result;
      } catch (e) {
        const msg =
          e instanceof AiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Generation failed';
        console.error('[AI]', key, msg, e);
        setAiNotice({ kind: 'error', message: msg });
        return null;
      } finally {
        setGeneratingKey(null);
      }
    },
    [hasApiKey],
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
        accountEmail={accountEmail}
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

  if (view === 'removeAds') {
    return (
      <RemoveAdsPage
        payment={payment}
        hasAccount={Boolean(userId)}
        onBack={() => openView('main')}
        onRemoveFree={handleRemoveFree}
        onPaymentComplete={async () => {
          await confirmPlayPurchase();
          await refreshProfile();
          openView('main');
        }}
      />
    );
  }

  return (
    <div
      className={
        showAdBanner && shouldUseNativeAds()
          ? 'app app--with-native-ads'
          : 'app'
      }
    >
      <Sidebar
        characters={sidebarCharacters}
        selectedId={selectedId}
        onSelect={handleSelectCharacter}
        onAdd={() => setShowNewCharModal(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenConfig={() => openView('config')}
        onOpenTos={() => openView('tos')}
        hasApiKey={hasApiKey}
        signedIn={signedIn}
        onSignOut={signedIn ? handleSignOut : undefined}
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
              onOpenCharacter={handleOpenFromNicknames}
              communityPhrasesEnabled={communityPhrasesEnabled}
              communityNicknamesEnabled={communityNicknamesEnabled}
              islandersNickOpen={islandersNickOpen}
              onIslandersNickOpenChange={handleIslandersNickOpenChange}
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
        {showAdBanner && (
          <AdBanner
            payment={payment}
            onOpenRemoveAds={() => openView('removeAds')}
          />
        )}
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

      <SyncBanner
        syncError={syncError}
        showLocalPrompt={storageMode === 'local' && syncAvailable}
        onCreateAccount={() => onOpenAuth('signUp')}
        onSignIn={() => onOpenAuth('signIn')}
      />

      <AiGenerationStatus
        busy={generatingKey !== null}
        notice={aiNotice}
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
    </div>
  );
}
