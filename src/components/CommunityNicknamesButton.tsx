import { useState } from 'react';
import {
  fetchCommunityDefaultNicknames,
  fetchCommunityOutgoingNicknames,
  filterNewCommunityNicknames,
} from '../lib/communityNicknames';
import { Modal } from './Modal';

interface CommunityNicknamesButtonProps {
  characterName: string;
  targetName?: string;
  existingNicknames: string[];
  disabled?: boolean;
  onAddNickname: (text: string) => void;
}

export function CommunityNicknamesButton({
  characterName,
  targetName,
  existingNicknames,
  disabled,
  onAddNickname,
}: CommunityNicknamesButtonProps) {
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
      const raw = targetName
        ? await fetchCommunityOutgoingNicknames(characterName, targetName)
        : await fetchCommunityDefaultNicknames(characterName);
      const filtered = filterNewCommunityNicknames(existingNicknames, raw);
      if (filtered.length === 0) {
        window.alert(
          'No new nicknames from other islands for this character name yet.',
        );
        return;
      }
      setSuggestions(filtered);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Could not load community nicknames',
      );
    } finally {
      setBusy(false);
    }
  };

  const label = targetName
    ? `Community nicknames for ${targetName}`
    : 'Community default nicknames';

  return (
    <>
      <button
        type="button"
        className="btn-community"
        disabled={disabled || busy}
        title={`${label} (free when signed in)`}
        aria-label={label}
        onClick={handleFetch}
      >
        {busy ? '…' : '👥'}
      </button>
      {suggestions && (
        <Modal title={label} onClose={() => setSuggestions(null)}>
          <p className="modal-hint">
            Nicknames from other accounts using the same character name. Authors
            are not shown.
          </p>
          <ul className="community-phrase-list">
            {suggestions.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  className="community-phrase-pick"
                  onClick={() => {
                    onAddNickname(text);
                    setSuggestions(null);
                  }}
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
