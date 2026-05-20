import { getInitials } from '../types';
import type { Character } from '../types';

interface SidebarProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReset: () => void;
  onClearAll: () => void;
  onOpenConfig: () => void;
  hasApiKey: boolean;
  seedsAvailable: boolean;
}

export function Sidebar({
  characters,
  selectedId,
  onSelect,
  onAdd,
  onReset,
  onClearAll,
  onOpenConfig,
  hasApiKey,
  seedsAvailable,
}: SidebarProps) {
  const handleReset = () => {
    if (
      window.confirm(
        'Reset all data from seed files? This will overwrite your saved changes.',
      )
    ) {
      onReset();
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        'Clear all islanders and dialogue? This cannot be undone.',
      )
    ) {
      onClearAll();
    }
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1 className="app-title">Tomodachi Dictionary</h1>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          + Add character
        </button>
        {hasApiKey && (
          <span className="api-badge" title="Gemini API key configured">
            AI on
          </span>
        )}
      </header>
      <nav className="character-list" aria-label="Characters">
        {characters.length === 0 ? (
          <p className="empty-hint">No characters yet.</p>
        ) : (
          characters.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`character-item${selectedId === c.id ? ' selected' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="avatar" aria-hidden="true">
                {getInitials(c.name)}
              </span>
              <span className="character-name">{c.name}</span>
            </button>
          ))
        )}
      </nav>
      <footer className="sidebar-footer">
        <button type="button" className="btn btn-ghost" onClick={onOpenConfig}>
          Configuration
        </button>
        {seedsAvailable ? (
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset from seed
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={handleClearAll}>
            Clear all data
          </button>
        )}
      </footer>
    </aside>
  );
}
