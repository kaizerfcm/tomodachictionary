import { useMemo, useState } from 'react';
import {
  getEffectiveNickname,
  getNicknameInputValue,
  getNicknamePlaceholder,
} from '../lib/nicknames';
import { getInitials, type Character } from '../types';

const MAX_VISIBLE = 12;

interface NicknamePanelProps {
  speaker: Character;
  allCharacters: Character[];
  onUpdateDefault: (value: string) => void;
  onUpdateNickname: (targetId: string, value: string) => void;
}

export function NicknamePanel({
  speaker,
  allCharacters,
  onUpdateDefault,
  onUpdateNickname,
}: NicknamePanelProps) {
  const [filter, setFilter] = useState('');

  const { visible, total, truncated } = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const others = allCharacters.filter((c) => c.id !== speaker.id);

    const filtered = others.filter((c) => {
      if (!needle) return true;
      const effective = getEffectiveNickname(speaker, c);
      return (
        c.name.toLowerCase().includes(needle) ||
        effective.toLowerCase().includes(needle)
      );
    });

    const total = filtered.length;
    const visible = filtered.slice(0, MAX_VISIBLE);
    const truncated = total > MAX_VISIBLE;

    return { visible, total, truncated };
  }, [allCharacters, speaker, filter]);

  return (
    <section className="nicknames-panel">
      <h2 className="panel-title">Calls others</h2>
      <p className="panel-desc">
        How {speaker.name} addresses other islanders. Unlisted characters use
        the default below.
      </p>
      <div className="nickname-default-row">
        <label className="nickname-default-label" htmlFor="nickname-default">
          Default (new islanders)
        </label>
        <input
          id="nickname-default"
          type="text"
          className="nickname-input nickname-default-input"
          value={speaker.nicknameDefault}
          onChange={(e) => onUpdateDefault(e.target.value)}
          placeholder="e.g. Hey idiot"
          aria-label="Default nickname for new islanders"
        />
      </div>
      <input
        type="search"
        className="filter-input"
        placeholder="Filter by name or nickname…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter characters"
      />
      {truncated && (
        <p className="filter-hint" role="status">
          Showing {MAX_VISIBLE} of {total} — refine filter to see more
        </p>
      )}
      {!truncated && total > 0 && filter && (
        <p className="filter-hint" role="status">
          {total} match{total === 1 ? '' : 'es'}
        </p>
      )}
      <ul className="nickname-list">
        {visible.length === 0 ? (
          <li className="empty-hint">
            {filter ? 'No characters match your filter.' : 'No other characters.'}
          </li>
        ) : (
          visible.map((target) => (
            <li key={target.id} className="nickname-row">
              <span className="avatar avatar-sm" aria-hidden="true">
                {getInitials(target.name)}
              </span>
              <span className="nickname-target">{target.name}</span>
              <input
                type="text"
                className="nickname-input"
                value={getNicknameInputValue(speaker, target)}
                placeholder={getNicknamePlaceholder(speaker, target)}
                onChange={(e) => onUpdateNickname(target.id, e.target.value)}
                aria-label={`Nickname for ${target.name}`}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
