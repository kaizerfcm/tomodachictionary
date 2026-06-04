import { useState } from 'react';
import type { Character, InteractionTopicKind } from '../types';
import { CharacterAvatar } from './CharacterAvatar';
import { AiSparkButton } from './AiSparkButton';
import { EditorSectionHeader } from './EditorSectionHeader';
import { InteractionTopicEditor } from './InteractionTopicEditor';

interface ConversationTopicsPanelProps {
  subject: Character;
  allCharacters: Character[];
  onUpdateInteractionTopic: (
    targetId: string,
    text: string,
    kind: InteractionTopicKind,
  ) => void;
  onRegenerateAll: () => Promise<void>;
  onGenerateOne: (targetId: string) => Promise<void>;
  generatingKey: string | null;
  hasApiKey: boolean;
}

export function ConversationTopicsPanel({
  subject,
  allCharacters,
  onUpdateInteractionTopic,
  onRegenerateAll,
  onGenerateOne,
  generatingKey,
  hasApiKey,
}: ConversationTopicsPanelProps) {
  const otherCharacters = allCharacters.filter((c) => c.id !== subject.id);
  const topics = subject.interactionTopics || {};
  const [filterOpen, setFilterOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');

  const filteredCharacters = otherCharacters.filter((c) =>
    c.name.toLowerCase().includes(topicSearch.toLowerCase()),
  );

  return (
    <section className="topics-panel editor-section">
      <EditorSectionHeader title="Conversation Topics">
        <button
          type="button"
          className={`btn btn-ghost btn-sm${filterOpen ? ' btn-active' : ''}`}
          onClick={() => setFilterOpen((open) => !open)}
          aria-pressed={filterOpen}
        >
          {filterOpen ? 'Hide filter' : 'Show filter'}
        </button>
        {hasApiKey && otherCharacters.length > 0 && (
          <AiSparkButton
            onClick={onRegenerateAll}
            disabled={generatingKey === 'topics:all' || !hasApiKey}
            busy={generatingKey === 'topics:all'}
            title="Suggest topics for all islanders"
          />
        )}
      </EditorSectionHeader>

      {otherCharacters.length === 0 ? (
        <p className="no-islanders-hint">No islanders</p>
      ) : (
        <>
          {filterOpen && (
            <div className="topics-toolbar">
              <label className="sr-only" htmlFor={`topics-search-${subject.id}`}>
                Search islanders
              </label>
              <input
                id={`topics-search-${subject.id}`}
                type="search"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="topics-search-input filter-input filter-input-sm"
              />
            </div>
          )}

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
                    {hasApiKey && (
                      <AiSparkButton
                        onClick={() => onGenerateOne(char.id)}
                        disabled={isGeneratingThis || !hasApiKey}
                        busy={isGeneratingThis}
                      />
                    )}
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
    </section>
  );
}
