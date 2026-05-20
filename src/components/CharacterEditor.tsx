import type { Character } from '../types';
import type { PhraseType } from '../types';
import { AiGenerateBar } from './AiGenerateBar';
import { PhraseEditor } from './PhraseSection';
import { NicknamePanel } from './NicknamePanel';

interface CharacterEditorProps {
  character: Character;
  allCharacters: Character[];
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onUpdatePhrase: (type: PhraseType, index: number, text: string) => void;
  onAddPhrase: (type: PhraseType) => void;
  onRemovePhrase: (type: PhraseType, index: number) => void;
  hasApiKey: boolean;
  generating: boolean;
  genError: string | null;
  onUpdateNicknameDefault: (value: string) => void;
  onUpdateNickname: (targetId: string, value: string) => void;
  onGeneratePhrases: () => void;
  onRegenerateNicknames: () => void;
}

export function CharacterEditor({
  character,
  allCharacters,
  onNameChange,
  onDelete,
  onUpdatePhrase,
  onAddPhrase,
  onRemovePhrase,
  hasApiKey,
  generating,
  genError,
  onUpdateNicknameDefault,
  onUpdateNickname,
  onGeneratePhrases,
  onRegenerateNicknames,
}: CharacterEditorProps) {
  const handleDelete = () => {
    if (
      window.confirm(
        `Remove "${character.name}"? This cannot be undone.`,
      )
    ) {
      onDelete();
    }
  };

  return (
    <main className="editor">
      <header className="editor-header">
        <input
          type="text"
          className="character-title-input"
          value={character.name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Character name"
        />
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete character
        </button>
      </header>
      {hasApiKey && (
        <AiGenerateBar
          generating={generating}
          error={genError}
          onGeneratePhrases={onGeneratePhrases}
          onRegenerateNicknames={onRegenerateNicknames}
        />
      )}
      <PhraseEditor
        phrases={character.phrases}
        onUpdatePhrase={(type, index, text) =>
          onUpdatePhrase(type, index, text)
        }
        onAddPhrase={onAddPhrase}
        onRemovePhrase={onRemovePhrase}
      />
      <NicknamePanel
        speaker={character}
        allCharacters={allCharacters}
        onUpdateDefault={onUpdateNicknameDefault}
        onUpdateNickname={onUpdateNickname}
      />
    </main>
  );
}
