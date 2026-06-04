import { useState } from 'react';
import type { Character, InteractionTopicKind, LevelUpRewards } from '../types';
import { CharacterAvatar } from './CharacterAvatar';
import { AiSparkButton } from './AiSparkButton';
import { GiftsFieldsEditor } from './GiftsFieldsEditor';
import { InteractionTopicEditor } from './InteractionTopicEditor';

interface SocialRewardsPanelProps {
  subject: Character;
  allCharacters: Character[];
  isOpen: boolean;
  onIsOpenChange: (open: boolean) => void;
  onUpdateLevelUpRewards: (rewards: LevelUpRewards) => void;
  onUpdateInteractionTopic: (
    targetId: string,
    text: string,
    kind: InteractionTopicKind,
  ) => void;
  onGenerateLevelUpRewards: () => Promise<void>;
  onGenerateInteractionTopic: (targetId: string) => Promise<void>;
  onGenerateAllInteractionTopics: () => Promise<void>;
  generatingKey: string | null;
  hasApiKey: boolean;
}

export function SocialRewardsPanel({
  subject,
  allCharacters,
  isOpen,
  onIsOpenChange,
  onUpdateLevelUpRewards,
  onUpdateInteractionTopic,
  onGenerateLevelUpRewards,
  onGenerateInteractionTopic,
  onGenerateAllInteractionTopics,
  generatingKey,
  hasApiKey,
}: SocialRewardsPanelProps) {
  const otherCharacters = allCharacters.filter((c) => c.id !== subject.id);
  const rewards = subject.levelUpRewards || {
    song: '',
    interior: '',
    clothing: '',
    hat: '',
    goods: '',
    quirks: '',
  };
  const topics = subject.interactionTopics || {};

  const [topicSearch, setTopicSearch] = useState('');

  const filteredCharacters = otherCharacters.filter((c) =>
    c.name.toLowerCase().includes(topicSearch.toLowerCase()),
  );

  return (
    <details
      className="nicknames-collapsible social-rewards-collapsible"
      open={isOpen}
      onToggle={(e) => onIsOpenChange((e.target as HTMLDetailsElement).open)}
    >
      <summary className="nicknames-collapsible-summary">
        <span className="nicknames-collapsible-chevron">
          {isOpen ? '▼' : '▶'}
        </span>
        <span>Gifts & Conversation Topics</span>
      </summary>

      <div className="nicknames-collapsible-body social-rewards-body">
        <div className="social-section-card">
          <div className="social-section-header">
            <h4>Gifts</h4>
            <AiSparkButton
              onClick={onGenerateLevelUpRewards}
              disabled={generatingKey === 'rewards' || !hasApiKey}
              busy={generatingKey === 'rewards'}
              title="Suggest gifts"
            />
          </div>
          <GiftsFieldsEditor
            gifts={rewards}
            onChange={onUpdateLevelUpRewards}
            idPrefix={`gifts-${subject.id}`}
          />
        </div>

        <div className="social-section-card margin-top">
          <div className="social-section-header">
            <h4>Islander Conversation Topics</h4>
            {otherCharacters.length > 0 && (
              <AiSparkButton
                onClick={onGenerateAllInteractionTopics}
                disabled={generatingKey === 'all-topics' || !hasApiKey}
                busy={generatingKey === 'all-topics'}
                title="Suggest topics for all islanders"
              />
            )}
          </div>

          {otherCharacters.length === 0 ? (
            <p className="no-islanders-hint">No islanders</p>
          ) : (
            <>
              <div className="topics-toolbar">
                <label className="sr-only" htmlFor={`topics-search-${subject.id}`}>
                  Search islanders
                </label>
                <input
                  id={`topics-search-${subject.id}`}
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="topics-search-input"
                />
              </div>

              <div className="topics-list">
                {filteredCharacters.map((char) => {
                  const currentTopic = topics[char.id];
                  const isGeneratingThis = generatingKey === `topic-${char.id}`;
                  return (
                    <div key={char.id} className="topic-row">
                      <div className="topic-islander">
                        <CharacterAvatar character={char} size="sm" />
                        <span className="topic-islander-name">{char.name}</span>
                      </div>
                      <div className="topic-input-container">
                        <InteractionTopicEditor
                          topic={currentTopic}
                          onChange={(text, kind) =>
                            onUpdateInteractionTopic(char.id, text, kind)
                          }
                        />
                        <AiSparkButton
                          onClick={() => onGenerateInteractionTopic(char.id)}
                          disabled={isGeneratingThis || !hasApiKey}
                          busy={isGeneratingThis}
                        />
                      </div>
                    </div>
                  );
                })}
                {filteredCharacters.length === 0 && (
                  <p className="no-islanders-hint">No matches</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </details>
  );
}
