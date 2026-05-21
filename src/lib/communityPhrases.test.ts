import { describe, expect, it } from 'vitest';
import {
  COMMUNITY_SUGGESTION_LIMIT,
  filterNewCommunitySuggestions,
} from './communityPhrases';

describe('filterNewCommunitySuggestions', () => {
  it('removes duplicates and existing phrases', () => {
    const result = filterNewCommunitySuggestions(
      ['Hello', 'Hi'],
      ['hello', 'Hey', 'Hi', 'Hey'],
    );
    expect(result).toEqual(['Hey']);
  });

  it('caps at limit', () => {
    const incoming = Array.from({ length: 20 }, (_, i) => `line ${i}`);
    const result = filterNewCommunitySuggestions([], incoming, 12);
    expect(result).toHaveLength(COMMUNITY_SUGGESTION_LIMIT);
  });
});
