import type { Character } from '../types';
import type { GridSort } from './uiPrefs';

export function sortCharacters(
  characters: Character[],
  sort: GridSort,
): Character[] {
  const list = [...characters];
  if (sort === 'name') {
    return list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }
  return list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
