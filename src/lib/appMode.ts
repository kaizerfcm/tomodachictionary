export type AppStorageMode = 'unset' | 'local' | 'cloud';

const MODE_KEY = 'tomodachi-storage-mode';

export function getAppStorageMode(): AppStorageMode {
  const v = localStorage.getItem(MODE_KEY);
  if (v === 'local' || v === 'cloud') return v;
  return 'unset';
}

export function setAppStorageMode(mode: 'local' | 'cloud'): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function clearAppStorageMode(): void {
  localStorage.removeItem(MODE_KEY);
}
