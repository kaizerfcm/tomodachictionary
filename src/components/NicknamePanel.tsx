import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_NICKNAME_OPTIONS, MAX_SHORT_TEXT_LENGTH } from '../constants';
import {
  countMissingNicknamePairs,
  getMissingNicknamePairs,
} from '../lib/missingNicknames';
import { getPairNicknamesForSearch } from '../lib/nicknames';
import type { Character } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { CommunityNicknamesButton } from './CommunityNicknamesButton';
import { LocalSuggestButton } from './LocalSuggestButton';
import { CharacterAvatar } from './CharacterAvatar';

const MAX_VISIBLE = 24;

interface NicknamePanelProps {
  subject: Character;
  allCharacters: Character[];
  focusCharacterId?: string | null;
  islandersOpen: boolean;
  onIslandersOpenChange: (open: boolean) => void;
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
  communityNicknamesEnabled?: boolean;
  generatingKey?: string | null;
  onSuggestLocalDefault?: () => void;
  onCanonAiDefault?: () => void;
  onSuggestLocalMissing?: () => void;
  onCanonAiMissing?: () => void;
  onAddDefaultNickname?: (value: string) => void;
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

function IslanderNicknameCard({
  subject,
  other,
  outgoingValues,
  incomingValues,
  onOpenCharacter,
  onUpdateOutgoingAt,
  onRemoveOutgoingAt,
  onAddOutgoing,
  onUpdateIncomingAt,
  onRemoveIncomingAt,
  onAddIncoming,
}: {
  subject: Character;
  other: Character;
  outgoingValues: string[];
  incomingValues: string[];
  onOpenCharacter: (id: string) => void;
  onUpdateOutgoingAt: (index: number, value: string) => void;
  onRemoveOutgoingAt: (index: number) => void;
  onAddOutgoing: () => void;
  onUpdateIncomingAt: (index: number, value: string) => void;
  onRemoveIncomingAt: (index: number) => void;
  onAddIncoming: () => void;
}) {
  const canAddOutgoing = outgoingValues.length < MAX_NICKNAME_OPTIONS;
  const canAddIncoming = incomingValues.length < MAX_NICKNAME_OPTIONS;

  return (
    <li className="nickname-pair-card">
      <button
        type="button"
        className="nickname-pair-card-head"
        onClick={() => onOpenCharacter(other.id)}
        title={`Open ${other.name}`}
      >
        <CharacterAvatar character={other} size="sm" />
        <span className="nickname-pair-name">{other.name}</span>
      </button>
      <div className="nickname-pair-body">
        <div className="nickname-pair-row">
          <div className="nickname-pair-row-head">
            <span className="nickname-pair-label">{subject.name} calls them</span>
            <div className="nickname-pair-row-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!canAddOutgoing}
                onClick={onAddOutgoing}
              >
                +
              </button>
            </div>
          </div>
          {outgoingValues.length > 0 ? (
            <NicknameChipList
              values={outgoingValues}
              onUpdateAt={onUpdateOutgoingAt}
              onRemoveAt={onRemoveOutgoingAt}
              ariaLabel={`${subject.name} calls ${other.name}`}
              maxLength={MAX_SHORT_TEXT_LENGTH}
            />
          ) : (
            <p className="nickname-mini-empty">None yet</p>
          )}
        </div>
        <div className="nickname-pair-row">
          <div className="nickname-pair-row-head">
            <span className="nickname-pair-label">They call {subject.name}</span>
            <div className="nickname-pair-row-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!canAddIncoming}
                onClick={onAddIncoming}
              >
                +
              </button>
            </div>
          </div>
          {incomingValues.length > 0 ? (
            <NicknameChipList
              values={incomingValues}
              onUpdateAt={onUpdateIncomingAt}
              onRemoveAt={onRemoveIncomingAt}
              ariaLabel={`${other.name} calls ${subject.name}`}
            />
          ) : (
            <p className="nickname-mini-empty">None yet — edit on their profile or add here</p>
          )}
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

function filterIslanders(
  others: Character[],
  subject: Character,
  needle: string,
): Character[] {
  if (!needle) return others;
  const n = needle.toLowerCase();
  return others.filter((c) => {
    const haystack = getPairNicknamesForSearch(subject, c);
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
  islandersOpen,
  onIslandersOpenChange,
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
  communityNicknamesEnabled,
  generatingKey,
  onSuggestLocalDefault,
  onCanonAiDefault,
  onSuggestLocalMissing,
  onCanonAiMissing,
  onAddDefaultNickname,
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
  const visibleIslanders = useMemo(
    () => filterIslanders(others, subject, needle),
    [others, subject, needle],
  );

  const defaults = subject.nicknameDefaults;
  const canAddDefault = defaults.length < MAX_NICKNAME_OPTIONS;
  const missingPairs = useMemo(
    () => getMissingNicknamePairs(subject, allCharacters),
    [subject, allCharacters],
  );
  const missingCount = countMissingNicknamePairs(missingPairs);
  const batchBusy = generatingKey === 'nick:missing';

  return (
    <section className="nicknames-panel">
      <input
        type="search"
        className="filter-input filter-input-sm nicknames-panel-filter"
        placeholder="Filter islanders…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter islander nicknames"
      />

      <details className="nicknames-collapsible" open={islandersOpen}>
        <CollapsibleSummary
          open={islandersOpen}
          onToggle={onIslandersOpenChange}
        >
          Nicknames with islanders
        </CollapsibleSummary>
        <div className="nicknames-collapsible-body">
          <div className="nickname-compact-block">
            <div className="nickname-compact-head">
              <span className="nickname-compact-label">
                Defaults (new islanders)
              </span>
              <span className="nickname-compact-actions">
                {communityNicknamesEnabled && onAddDefaultNickname && (
                  <CommunityNicknamesButton
                    characterName={subject.name}
                    existingNicknames={defaults}
                    disabled={!canAddDefault}
                    onAddNickname={onAddDefaultNickname}
                  />
                )}
                {onSuggestLocalDefault && (
                  <LocalSuggestButton
                    busy={generatingKey === 'nick:local:default'}
                    disabled={!canAddDefault}
                    title="Suggest default nickname (free)"
                    onClick={onSuggestLocalDefault}
                  />
                )}
                {hasApiKey && onCanonAiDefault && (
                  <AiSparkButton
                    busy={generatingKey === 'nick:default'}
                    disabled={!canAddDefault}
                    title="Canon AI — default nickname (uses API)"
                    onClick={onCanonAiDefault}
                  />
                )}
              </span>
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

          {others.length > 0 &&
            (onSuggestLocalMissing || (hasApiKey && onCanonAiMissing)) && (
            <div className="nickname-batch-toolbar">
              {onSuggestLocalMissing && (
                <LocalSuggestButton
                  busy={generatingKey === 'nick:local:missing'}
                  disabled={missingCount === 0}
                  title={
                    missingCount === 0
                      ? 'All islander nicknames are set'
                      : `Suggest ${missingCount} missing (free)`
                  }
                  onClick={onSuggestLocalMissing}
                />
              )}
              {hasApiKey && onCanonAiMissing && (
                <AiSparkButton
                  busy={batchBusy}
                  disabled={missingCount === 0}
                  title={
                    missingCount === 0
                      ? 'All islander nicknames are set'
                      : `Canon AI — ${missingCount} missing (uses API)`
                  }
                  onClick={onCanonAiMissing}
                />
              )}
              <span className="nickname-batch-label">
                {missingCount === 0
                  ? 'All islander nicknames set'
                  : `Fill missing (${missingCount})`}
              </span>
            </div>
          )}

          <ul className="nickname-pair-grid">
            {visibleIslanders.length === 0 ? (
              <li className="empty-hint">No matches.</li>
            ) : (
              visibleIslanders.slice(0, MAX_VISIBLE).map((other) => (
                <IslanderNicknameCard
                  key={other.id}
                  subject={subject}
                  other={other}
                  outgoingValues={subject.nicknames[other.id] ?? []}
                  incomingValues={other.nicknames[subject.id] ?? []}
                  onOpenCharacter={onOpenCharacter}
                  onUpdateOutgoingAt={(i, v) =>
                    onUpdateOutgoingAt(other.id, i, v)
                  }
                  onRemoveOutgoingAt={(i) => onRemoveOutgoing(other.id, i)}
                  onAddOutgoing={() => onAddOutgoing(other.id)}
                  onUpdateIncomingAt={(i, v) =>
                    onUpdateIncomingAt(other.id, i, v)
                  }
                  onRemoveIncomingAt={(i) => onRemoveIncoming(other.id, i)}
                  onAddIncoming={() => onAddIncoming(other.id)}
                />
              ))
            )}
          </ul>
        </div>
      </details>
    </section>
  );
}
