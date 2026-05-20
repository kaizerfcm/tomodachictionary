const KEY = 'tomodachi.adsRemoved';

export function getLocalAdsRemoved(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setLocalAdsRemoved(removed: boolean): void {
  try {
    localStorage.setItem(KEY, removed ? '1' : '0');
  } catch {
    /* ignore */
  }
}
