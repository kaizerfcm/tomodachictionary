import { AVATAR_JPEG_QUALITY, AVATAR_MAX_PX } from '../constants';

const DATA_URL_RE = /^data:image\/(jpeg|webp);base64,/i;

export function isValidAvatarDataUrl(value: string | undefined): value is string {
  return typeof value === 'string' && DATA_URL_RE.test(value) && value.length < 32_000;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

/** Fit inside a square of AVATAR_MAX_PX. */
export function fitAvatarDimensions(
  width: number,
  height: number,
  maxPx = AVATAR_MAX_PX,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: maxPx, height: maxPx };
  const scale = maxPx / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Resize and re-encode as JPEG data URL. Always replaces prior avatar bytes.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  const img = await loadImage(file);
  const { width, height } = fitAvatarDimensions(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY);
  if (!isValidAvatarDataUrl(dataUrl)) {
    throw new Error('Avatar encoding failed');
  }
  return dataUrl;
}
