import { useRef, useState } from 'react';
import { APP_NAME } from '../constants';
import type { Character } from '../types';
import {
  getSidebarCollapsed,
  getSidebarListOpen,
  setSidebarCollapsed,
  setSidebarListOpen,
} from '../lib/uiPrefs';
import { CharacterAvatar } from './CharacterAvatar';
import { IconButton } from './IconButton';

interface SidebarProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onOpenConfig: () => void;
  onOpenTos: () => void;
  hasApiKey: boolean;
  signedIn?: boolean;
  onSignOut?: () => void;
}

export function Sidebar({
  characters,
  selectedId,
  onSelect,
  onAdd,
  onExportJson,
  onImportJson,
  onOpenConfig,
  onOpenTos,
  hasApiKey,
  signedIn,
  onSignOut,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const [listOpen, setListOpen] = useState(getSidebarListOpen);
  const importRef = useRef<HTMLInputElement>(null);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      setSidebarCollapsed(next);
      return next;
    });
  };

  const toggleList = () => {
    setListOpen((open) => {
      const next = !open;
      setSidebarListOpen(next);
      return next;
    });
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    onImportJson(file);
    if (importRef.current) importRef.current.value = '';
  };

  const showList = collapsed || listOpen;

  return (
    <aside
      className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}
      aria-label="Navigation"
    >
      <header className="sidebar-header">
        <div className="sidebar-header-top">
          {!collapsed && <h1 className="app-title">{APP_NAME}</h1>}
          <IconButton
            icon={collapsed ? 'menu' : 'panelClose'}
            label={collapsed ? 'Expand menu' : 'Collapse menu'}
            onClick={toggleCollapsed}
            active={collapsed}
          />
        </div>
        {!collapsed && (
          <>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={onAdd}>
              + Add character
            </button>
            {hasApiKey && (
              <span className="api-badge" title="Gemini API key configured">
                AI on
              </span>
            )}
          </>
        )}
        {collapsed && (
          <IconButton icon="add" label="Add character" onClick={onAdd} variant="primary" />
        )}
      </header>

      <div className="sidebar-list-section">
        {!collapsed && (
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
        )}
        {showList && (
          <nav
            className={`character-list${collapsed ? ' character-list-collapsed' : ''}`}
            aria-label="Characters"
          >
            {characters.length === 0 ? (
              <p className="empty-hint sidebar-empty">No characters yet.</p>
            ) : (
              characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`character-item${selectedId === c.id ? ' selected' : ''}${collapsed ? ' character-item-collapsed' : ''}`}
                  onClick={() => onSelect(c.id)}
                  title={c.name}
                >
                  <CharacterAvatar character={c} size={collapsed ? 'sm' : 'sm'} />
                  {!collapsed && (
                    <span className="character-name">{c.name}</span>
                  )}
                </button>
              ))
            )}
          </nav>
        )}
      </div>

      <footer className="sidebar-footer">
        <div className="sidebar-icon-toolbar">
          <IconButton icon="settings" label="Configuration" onClick={onOpenConfig} />
          <IconButton icon="terms" label="Terms of service" onClick={onOpenTos} />
          <IconButton icon="export" label="Export JSON" onClick={onExportJson} />
          <IconButton
            icon="import"
            label="Import JSON"
            onClick={() => importRef.current?.click()}
          />
          {signedIn && onSignOut && (
            <IconButton icon="signOut" label="Sign out" onClick={onSignOut} />
          )}
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => handleImportFile(e.target.files?.[0])}
        />
      </footer>
    </aside>
  );
}
