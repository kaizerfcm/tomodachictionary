import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_PX } from '../constants';
import { fitAvatarDimensions, isValidAvatarDataUrl } from './avatar';

describe('avatar', () => {
  it('fits wide images into square max px', () => {
    const { width, height } = fitAvatarDimensions(200, 100, AVATAR_MAX_PX);
    expect(width).toBe(AVATAR_MAX_PX);
    expect(height).toBeLessThanOrEqual(AVATAR_MAX_PX);
  });

  it('fits tall images into square max px', () => {
    const { width, height } = fitAvatarDimensions(80, 400, AVATAR_MAX_PX);
    expect(height).toBe(AVATAR_MAX_PX);
    expect(width).toBeLessThanOrEqual(AVATAR_MAX_PX);
  });

  it('accepts jpeg data URLs', () => {
    expect(isValidAvatarDataUrl('data:image/jpeg;base64,abc')).toBe(true);
    expect(isValidAvatarDataUrl('data:text/plain,x')).toBe(false);
  });
});
