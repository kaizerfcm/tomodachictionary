import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_NICKNAME_OPTIONS, MAX_SHORT_TEXT_LENGTH } from '../constants';
import {
  getAllNicknamesForSearch,
  getIncomingNicknamesForSearch,
} from '../lib/nicknames';
import type { Character } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { CharacterAvatar } from './CharacterAvatar';

const MAX_VISIBLE = 24;

interface NicknamePanelProps {
  subject: Character;
  allCharacters: Character[];
  /** When set (e.g. after opening another character from this panel), pre-fills the list filter. */
  focusCharacterId?: string | null;
  outgoingOpen: boolean;
  incomingOpen: boolean;
  onOutgoingOpenChange: (open: boolean) => void;
  onIncomingOpenChange: (open: boolean) => void;
  onOpenCharacter: (id: string) => void;
  onUpdateDefaultAt: (index: number, value: string) => void;
  onAddDefault: () => void;
  onRemoveDefault: (index: number) => void;
  onUpdateOutgoingAt: (targetId: string, index: number, value: string) => void;
  onAddOutgoing: (targetId: string) => void;
  onRemoveOutgoing: (targetId: string, index: number) => void;
  onUpdateIncomingAt: (speakerId: string, index: number, value: string) => void;
  onAddIncoming: (speakerId: string) => void;
  onRemoveIncoming: (speakerId: string, index: number) => void;
  hasApiKey?: boolean;
  generatingKey?: string | null;
  onGenerateDefault?: () => void;
  onGenerateOutgoing?: (targetId: string) => void;
  onGenerateIncoming?: (speakerId: string) => void;
}

function NicknameChipList({
  values,
  onUpdateAt,
  onRemoveAt,
  ariaLabel,
  maxLength,
}: {
  values: string[];
  onUpdateAt: (index: number, value: string) => void;
  onRemoveAt: (index: number) => void;
  ariaLabel: string;
  maxLength?: number;
}) {
  return (
    <ul className="nickname-chip-list">
      {values.map((value, index) => (
        <li key={index} className="nickname-chip">
          <input
            type="text"
            className="nickname-chip-input"
            value={value}
            maxLength={maxLength}
            onChange={(e) => onUpdateAt(index, e.target.value)}
            aria-label={`${ariaLabel} ${index + 1}`}
          />
          <button
            type="button"
            className="btn-icon"
            onClick={() => onRemoveAt(index)}
            aria-label="Remove"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function NicknameMiniCard({
  character,
  values,
  canAdd,
  aiBusy,
  hasApiKey,
  onOpenCharacter,
  onAdd,
  onUpdateAt,
  onRemoveAt,
  onGenerate,
  generateTitle,
  ariaLabel,
  nicknameMaxLength,
}: {
  character: Character;
  values: string[];
  canAdd: boolean;
  aiBusy?: boolean;
  hasApiKey?: boolean;
  onOpenCharacter: (id: string) => void;
  onAdd: () => void;
  onUpdateAt: (index: number, value: string) => void;
  onRemoveAt: (index: number) => void;
  onGenerate?: () => void;
  generateTitle?: string;
  ariaLabel: string;
  nicknameMaxLength?: number;
}) {
  return (
    <li className="nickname-mini-card">
      <button
        type="button"
        className="nickname-mini-card-head"
        onClick={() => onOpenCharacter(character.id)}
        title={`Open ${character.name}`}
      >
        <CharacterAvatar character={character} size="sm" />
        <span className="nickname-mini-name">{character.name}</span>
      </button>
      <div className="nickname-mini-card-body">
        {values.length > 0 ? (
          <NicknameChipList
            values={values}
            onUpdateAt={onUpdateAt}
            onRemoveAt={onRemoveAt}
            ariaLabel={ariaLabel}
            maxLength={nicknameMaxLength}
          />
        ) : (
          <p className="nickname-mini-empty">No nicknames yet</p>
        )}
        <div className="nickname-mini-card-actions">
          {hasApiKey && onGenerate && (
            <AiSparkButton
              busy={aiBusy}
              disabled={!canAdd}
              title={generateTitle ?? 'Generate nickname'}
              onClick={onGenerate}
            />
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!canAdd}
            onClick={onAdd}
          >
            + Add
          </button>
        </div>
      </div>
    </li>
  );
}

function CollapsibleSummary({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <summary
      className="nicknames-collapsible-summary"
      onClick={(e) => {
        e.preventDefault();
        onToggle(!open);
      }}
    >
      <span className="nicknames-collapsible-chevron" aria-hidden="true">
        {open ? '▾' : '▸'}
      </span>
      {children}
    </summary>
  );
}

function filterOthers(
  others: Character[],
  subject: Character,
  needle: string,
  mode: 'outgoing' | 'incoming',
): Character[] {
  if (!needle) return others;
  const n = needle.toLowerCase();
  return others.filter((c) => {
    const haystack =
      mode === 'outgoing'
        ? getAllNicknamesForSearch(subject, c)
        : getIncomingNicknamesForSearch(c, subject);
    return (
      c.name.toLowerCase().includes(n) ||
      haystack.join(' ').toLowerCase().includes(n)
    );
  });
}

export function NicknamePanel({
  subject,
  allCharacters,
  focusCharacterId,
  outgoingOpen,
  incomingOpen,
  onOutgoingOpenChange,
  onIncomingOpenChange,
  onOpenCharacter,
  onUpdateDefaultAt,
  onAddDefault,
  onRemoveDefault,
  onUpdateOutgoingAt,
  onAddOutgoing,
  onRemoveOutgoing,
  onUpdateIncomingAt,
  onAddIncoming,
  onRemoveIncoming,
  hasApiKey,
  generatingKey,
  onGenerateDefault,
  onGenerateOutgoing,
  onGenerateIncoming,
}: NicknamePanelProps) {
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!focusCharacterId) return;
    const focus = allCharacters.find((c) => c.id === focusCharacterId);
    if (focus) setFilter(focus.name);
  }, [focusCharacterId, subject.id, allCharacters]);

  const others = useMemo(
    () => allCharacters.filter((c) => c.id !== subject.id),
    [allCharacters, subject.id],
  );

  const needle = filter.trim();

  const visibleOutgoing = useMemo(
    () => filterOthers(others, subject, needle, 'outgoing'),
    [others, subject, needle],
  );

  const visibleIncoming = useMemo(
    () => filterOthers(others, subject, needle, 'incoming'),
    [others, subject, needle],
  );

  const defaults = subject.nicknameDefaults;
  const canAddDefault = defaults.length < MAX_NICKNAME_OPTIONS;

  return (
    <section className="nicknames-panel">
      <input
        type="search"
        className="filter-input filter-input-sm nicknames-panel-filter"
        placeholder="Filter islanders…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter nickname lists"
      />

      <details className="nicknames-collapsible" open={outgoingOpen}>
        <CollapsibleSummary
          open={outgoingOpen}
          onToggle={onOutgoingOpenChange}
        >
          What {subject.name} calls others
        </CollapsibleSummary>
        <div className="nicknames-collapsible-body">
          <div className="nickname-compact-block">
            <div className="nickname-compact-head">
              <span className="nickname-compact-label">Defaults</span>
              {hasApiKey && onGenerateDefault && (
                <AiSparkButton
                  busy={generatingKey === 'nick:default'}
                  disabled={!canAddDefault}
                  title="Generate one default nickname"
                  onClick={onGenerateDefault}
                />
              )}
            </div>
            {defaults.length > 0 && (
              <NicknameChipList
                values={defaults}
                onUpdateAt={onUpdateDefaultAt}
                onRemoveAt={onRemoveDefault}
                ariaLabel="Default nickname"
                maxLength={MAX_SHORT_TEXT_LENGTH}
              />
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-add-below"
              disabled={!canAddDefault}
              onClick={onAddDefault}
            >
              +
            </button>
          </div>

          <ul className="nickname-mini-grid">
            {visibleOutgoing.length === 0 ? (
              <li className="empty-hint">No matches.</li>
            ) : (
              visibleOutgoing.slice(0, MAX_VISIBLE).map((target) => {
                const options = subject.nicknames[target.id] ?? [];
                const canAdd = options.length < MAX_NICKNAME_OPTIONS;
                return (
                  <NicknameMiniCard
                    key={target.id}
                    character={target}
                    values={options}
                    canAdd={canAdd}
                    aiBusy={generatingKey === `nick:out:${target.id}`}
                    hasApiKey={hasApiKey}
                    onOpenCharacter={onOpenCharacter}
                    onAdd={() => onAddOutgoing(target.id)}
                    onUpdateAt={(i, v) =>
                      onUpdateOutgoingAt(target.id, i, v)
                    }
                    onRemoveAt={(i) => onRemoveOutgoing(target.id, i)}
                    onGenerate={
                      onGenerateOutgoing
                        ? () => onGenerateOutgoing(target.id)
                        : undefined
                    }
                    generateTitle={`Generate nickname for ${target.name}`}
                    ariaLabel={`Nickname for ${target.name}`}
                    nicknameMaxLength={MAX_SHORT_TEXT_LENGTH}
                  />
                );
              })
            )}
          </ul>
        </div>
      </details>

      <details className="nicknames-collapsible" open={incomingOpen}>
        <CollapsibleSummary
          open={incomingOpen}
          onToggle={onIncomingOpenChange}
        >
          What others call {subject.name}
        </CollapsibleSummary>
        <div className="nicknames-collapsible-body">
          <ul className="nickname-mini-grid">
            {visibleIncoming.length === 0 ? (
              <li className="empty-hint">No matches.</li>
            ) : (
              visibleIncoming.slice(0, MAX_VISIBLE).map((speaker) => {
                const options = speaker.nicknames[subject.id] ?? [];
                const canAdd = options.length < MAX_NICKNAME_OPTIONS;
                return (
                  <NicknameMiniCard
                    key={speaker.id}
                    character={speaker}
                    values={options}
                    canAdd={canAdd}
                    aiBusy={generatingKey === `nick:in:${speaker.id}`}
                    hasApiKey={hasApiKey}
                    onOpenCharacter={onOpenCharacter}
                    onAdd={() => onAddIncoming(speaker.id)}
                    onUpdateAt={(i, v) =>
                      onUpdateIncomingAt(speaker.id, i, v)
                    }
                    onRemoveAt={(i) => onRemoveIncoming(speaker.id, i)}
                    onGenerate={
                      onGenerateIncoming
                        ? () => onGenerateIncoming(speaker.id)
                        : undefined
                    }
                    generateTitle={`Generate how ${speaker.name} calls ${subject.name}`}
                    ariaLabel={`${speaker.name} calls ${subject.name}`}
                  />
                );
              })
            )}
          </ul>
        </div>
      </details>
    </section>
  );
}
