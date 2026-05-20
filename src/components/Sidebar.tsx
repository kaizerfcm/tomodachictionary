import { useRef, useState } from 'react';
import type { Character } from '../types';
import { getSidebarListOpen, setSidebarListOpen } from '../lib/uiPrefs';
import { CharacterAvatar } from './CharacterAvatar';

interface SidebarProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onClearAll: () => void;
  onOpenConfig: () => void;
  onOpenTos: () => void;
  hasApiKey: boolean;
}

export function Sidebar({
  characters,
  selectedId,
  onSelect,
  onAdd,
  onExportJson,
  onImportJson,
  onClearAll,
  onOpenConfig,
  onOpenTos,
  hasApiKey,
}: SidebarProps) {
  const [listOpen, setListOpen] = useState(getSidebarListOpen);
  const importRef = useRef<HTMLInputElement>(null);

  const toggleList = () => {
    setListOpen((open) => {
      const next = !open;
      setSidebarListOpen(next);
      return next;
    });
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

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    onImportJson(file);
    if (importRef.current) importRef.current.value = '';
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1 className="app-title">Tomodachi Dictionary</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
          + Add character
        </button>
        {hasApiKey && (
          <span className="api-badge" title="Gemini API key configured">
            AI on
          </span>
        )}
      </header>

      <div className="sidebar-list-section">
        <button
          type="button"
          className="sidebar-list-toggle"
          onClick={toggleList}
          aria-expanded={listOpen}
        >
          <span>Islanders</span>
          <span className="sidebar-chevron" aria-hidden="true">
            {listOpen ? '▾' : '▸'}
          </span>
          <span className="sidebar-list-count">{characters.length}</span>
        </button>
        {listOpen && (
          <nav className="character-list" aria-label="Characters">
            {characters.length === 0 ? (
              <p className="empty-hint sidebar-empty">No characters yet.</p>
            ) : (
              characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`character-item${selectedId === c.id ? ' selected' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <CharacterAvatar character={c} size="sm" />
                  <span className="character-name">{c.name}</span>
                </button>
              ))
            )}
          </nav>
        )}
      </div>

      <footer className="sidebar-footer">
        <div className="sidebar-footer-row">
          <button type="button" className="btn btn-ghost" onClick={onOpenConfig}>
            Configuration
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenTos}>
            Terms
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onExportJson}>
          Export JSON
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => importRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => handleImportFile(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-ghost" onClick={handleClearAll}>
          Clear all data
        </button>
      </footer>
    </aside>
  );
}
