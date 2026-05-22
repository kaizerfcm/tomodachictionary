import { useRef } from 'react';
import type { Character } from '../types';
import type { PhraseType } from '../types';
import { fileToAvatarDataUrl } from '../lib/avatar';
import { CharacterAvatar } from './CharacterAvatar';
import { PhraseEditor } from './PhraseSection';
import { NicknamePanel } from './NicknamePanel';

interface CharacterEditorProps {
  character: Character;
  allCharacters: Character[];
  onBack: () => void;
  onNameChange: (name: string) => void;
  onAvatarChange: (dataUrl: string | undefined) => void;
  onDelete: () => void;
  onUpdatePhrase: (type: PhraseType, index: number, text: string) => void;
  onAddPhrase: (type: PhraseType, text?: string) => void;
  onRemovePhrase: (type: PhraseType, index: number) => void;
  hasApiKey: boolean;
  generatingKey: string | null;
  onUpdateNicknameDefaultAt: (index: number, value: string) => void;
  onAddNicknameDefault: (value?: string) => void;
  onRemoveNicknameDefault: (index: number) => void;
  onUpdateNicknameAt: (targetId: string, index: number, value: string) => void;
  onAddNickname: (targetId: string, value?: string) => void;
  onRemoveNickname: (targetId: string, index: number) => void;
  onUpdateIncomingAt: (speakerId: string, index: number, value: string) => void;
  onAddIncoming: (speakerId: string, value?: string) => void;
  onRemoveIncoming: (speakerId: string, index: number) => void;
  onGeneratePhrase: (type: PhraseType) => void;
  onGenerateDefaultNickname: () => void;
  onGenerateOutgoingNickname: (targetId: string) => void;
  onGenerateIncomingNickname: (speakerId: string) => void;
  onOpenCharacter: (id: string) => void;
  nicknameFocusCharacterId?: string | null;
  communityPhrasesEnabled?: boolean;
  outgoingNickOpen: boolean;
  incomingNickOpen: boolean;
  onOutgoingNickOpenChange: (open: boolean) => void;
  onIncomingNickOpenChange: (open: boolean) => void;
}

export function CharacterEditor({
  character,
  allCharacters,
  onBack,
  onNameChange,
  onAvatarChange,
  onDelete,
  onUpdatePhrase,
  onAddPhrase,
  onRemovePhrase,
  hasApiKey,
  generatingKey,
  onUpdateNicknameDefaultAt,
  onAddNicknameDefault,
  onRemoveNicknameDefault,
  onUpdateNicknameAt,
  onAddNickname,
  onRemoveNickname,
  onUpdateIncomingAt,
  onAddIncoming,
  onRemoveIncoming,
  onGeneratePhrase,
  onGenerateDefaultNickname,
  onGenerateOutgoingNickname,
  onGenerateIncomingNickname,
  onOpenCharacter,
  nicknameFocusCharacterId,
  outgoingNickOpen,
  incomingNickOpen,
  onOutgoingNickOpenChange,
  onIncomingNickOpenChange,
  communityPhrasesEnabled,
}: CharacterEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDelete = () => {
    if (
      window.confirm(
        `Remove "${character.name}"? This cannot be undone.`,
      )
    ) {
      onDelete();
    }
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      onAvatarChange(dataUrl);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Avatar upload failed');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="editor">
      <header className="editor-header">
        <button
          type="button"
          className="btn btn-ghost btn-back-editor"
          onClick={onBack}
          aria-label="Back to islanders"
        >
          ← Islanders
        </button>
        <div className="editor-identity">
          <label className="avatar-upload-label">
            <CharacterAvatar character={character} size="lg" />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
            />
            <span className="avatar-upload-hint">Change photo</span>
          </label>
          <input
            type="text"
            className="character-title-input"
            value={character.name}
            onChange={(e) => onNameChange(e.target.value)}
            aria-label="Character name"
          />
        </div>
        <div className="editor-header-actions">
          {character.avatar && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onAvatarChange(undefined)}
            >
              Remove photo
            </button>
          )}
          <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete character
          </button>
        </div>
      </header>
      {!hasApiKey && (
        <p className="gen-inline-hint">
          Add a Gemini API key in Configuration to use ✨ generate buttons.
        </p>
      )}
      <PhraseEditor
        characterName={character.name}
        communityEnabled={communityPhrasesEnabled}
        phrases={character.phrases}
        onUpdatePhrase={onUpdatePhrase}
        onAddPhrase={onAddPhrase}
        onRemovePhrase={onRemovePhrase}
        hasApiKey={hasApiKey}
        generatingKey={generatingKey}
        onGeneratePhrase={onGeneratePhrase}
      />
      <NicknamePanel
        subject={character}
        allCharacters={allCharacters}
        focusCharacterId={nicknameFocusCharacterId}
        outgoingOpen={outgoingNickOpen}
        incomingOpen={incomingNickOpen}
        onOutgoingOpenChange={onOutgoingNickOpenChange}
        onIncomingOpenChange={onIncomingNickOpenChange}
        onOpenCharacter={onOpenCharacter}
        onUpdateDefaultAt={onUpdateNicknameDefaultAt}
        onAddDefault={() => onAddNicknameDefault()}
        onRemoveDefault={onRemoveNicknameDefault}
        onUpdateOutgoingAt={onUpdateNicknameAt}
        onAddOutgoing={onAddNickname}
        onRemoveOutgoing={onRemoveNickname}
        onUpdateIncomingAt={onUpdateIncomingAt}
        onAddIncoming={onAddIncoming}
        onRemoveIncoming={onRemoveIncoming}
        hasApiKey={hasApiKey}
        generatingKey={generatingKey}
        onGenerateDefault={onGenerateDefaultNickname}
        onGenerateOutgoing={onGenerateOutgoingNickname}
        onGenerateIncoming={onGenerateIncomingNickname}
      />
    </main>
  );
}
