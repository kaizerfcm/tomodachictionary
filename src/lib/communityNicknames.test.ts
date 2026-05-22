import { describe, expect, it } from 'vitest';
import { filterNewCommunityNicknames } from './communityNicknames';

describe('filterNewCommunityNicknames', () => {
  it('drops duplicates case-insensitively', () => {
    const result = filterNewCommunityNicknames(['Buddy'], ['buddy', 'Pal'], 12);
    expect(result).toEqual(['Pal']);
  });
});
