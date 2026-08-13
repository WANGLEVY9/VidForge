export const MAX_MEDIA_UPLOAD_BYTES = 200 * 1024 * 1024;

export const MEDIA_MIME_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
} as const;

export type MediaAssetType = (typeof MEDIA_MIME_TYPES)[keyof typeof MEDIA_MIME_TYPES];

export function assetTypeForMime(mimeType: string): MediaAssetType | undefined {
  return MEDIA_MIME_TYPES[mimeType as keyof typeof MEDIA_MIME_TYPES];
}
