import { useState } from 'react';
import type { PhraseType } from '../types';
import {
  fetchCommunityPhraseSuggestions,
  filterNewCommunitySuggestions,
} from '../lib/communityPhrases';
import { Modal } from './Modal';

interface CommunityPhrasesButtonProps {
  characterName: string;
  phraseType: PhraseType;
  phraseLabel: string;
  existingPhrases: string[];
  disabled?: boolean;
  onAddPhrase: (text: string) => void;
}

export function CommunityPhrasesButton({
  characterName,
  phraseType,
  phraseLabel,
  existingPhrases,
  disabled,
  onAddPhrase,
}: CommunityPhrasesButtonProps) {
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  const handleFetch = async () => {
    if (!characterName.trim()) {
      window.alert('Add a character name first.');
      return;
    }
    setBusy(true);
    setSuggestions(null);
    try {
      const raw = await fetchCommunityPhraseSuggestions(
        characterName,
        phraseType,
      );
      const filtered = filterNewCommunitySuggestions(existingPhrases, raw);
      if (filtered.length === 0) {
        window.alert(
          'No new phrases from other islands for this character name yet.',
        );
        return;
      }
      setSuggestions(filtered);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Could not load community phrases',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (text: string) => {
    onAddPhrase(text);
    setSuggestions(null);
  };

  return (
    <>
      <button
        type="button"
        className="btn-community"
        disabled={disabled || busy}
        title={`Suggestions from other islands (${phraseLabel})`}
        aria-label={`Community phrase suggestions for ${phraseLabel}`}
        onClick={handleFetch}
      >
        {busy ? '…' : '👥'}
      </button>
      {suggestions && (
        <Modal
          title={`Community — ${phraseLabel}`}
          onClose={() => setSuggestions(null)}
        >
          <p className="modal-hint">
            Up to {suggestions.length} phrase
            {suggestions.length === 1 ? '' : 's'} from other accounts that use
            the same character name. Authors are not shown.
          </p>
          <ul className="community-phrase-list">
            {suggestions.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  className="community-phrase-pick"
                  onClick={() => handlePick(text)}
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
