export type GridSort = 'name' | 'dateAdded';

const KEYS = {
  sidebarList: 'tomodachi.sidebarListOpen',
  sidebarCollapsed: 'tomodict.sidebarCollapsed',
  islandersNick: 'tomodict.islandersNickOpen',
  gridSort: 'tomodachi.gridSort',
} as const;

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getSidebarListOpen(): boolean {
  return readBool(KEYS.sidebarList, true);
}

export function setSidebarListOpen(open: boolean): void {
  writeBool(KEYS.sidebarList, open);
}

export function getSidebarCollapsed(): boolean {
  return readBool(KEYS.sidebarCollapsed, false);
}

export function setSidebarCollapsed(collapsed: boolean): void {
  writeBool(KEYS.sidebarCollapsed, collapsed);
}

export function getIslandersNickOpen(): boolean {
  try {
    const v = localStorage.getItem(KEYS.islandersNick);
    if (v === '1') return true;
    if (v === '0') return false;
    const legacy =
      localStorage.getItem('tomodachi.outgoingNickOpen') === '1' ||
      localStorage.getItem('tomodachi.incomingNickOpen') === '1';
    if (legacy) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function setIslandersNickOpen(open: boolean): void {
  writeBool(KEYS.islandersNick, open);
}

export function getGridSort(): GridSort {
  try {
    const v = localStorage.getItem(KEYS.gridSort);
    if (v === 'name' || v === 'dateAdded') return v;
  } catch {
    /* ignore */
  }
  return 'name';
}

export function setGridSort(sort: GridSort): void {
  try {
    localStorage.setItem(KEYS.gridSort, sort);
  } catch {
    /* ignore */
  }
}
