import { useMemo } from 'react';
import type { Character } from '../types';
import type { GridSort } from '../lib/uiPrefs';
import { sortCharacters } from '../lib/sortCharacters';
import { CharacterAvatar } from './CharacterAvatar';

interface CharacterGridProps {
  characters: Character[];
  sort: GridSort;
  onSortChange: (sort: GridSort) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function CharacterGrid({
  characters,
  sort,
  onSortChange,
  onSelect,
  onAdd,
}: CharacterGridProps) {
  const sorted = useMemo(
    () => sortCharacters(characters, sort),
    [characters, sort],
  );

  return (
    <div className="character-grid-page">
      <header className="grid-page-header">
        <h2 className="grid-page-title">Islanders</h2>
        <div className="grid-page-actions">
          <label className="grid-sort-label">
            Sort
            <select
              className="grid-sort-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as GridSort)}
            >
              <option value="name">Name</option>
              <option value="dateAdded">Date added</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
            + Add
          </button>
        </div>
      </header>
      {sorted.length === 0 ? (
        <p className="empty-hint grid-empty">
          No characters yet. Add one to get started.
        </p>
      ) : (
        <ul className="character-grid">
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="character-grid-card"
                onClick={() => onSelect(c.id)}
              >
                <CharacterAvatar
                  character={c}
                  size="grid"
                  className="avatar-round"
                />
                <span className="character-grid-name">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
