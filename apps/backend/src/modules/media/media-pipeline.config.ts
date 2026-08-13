export const MEDIA_ASPECT_RATIOS = ['9:16', '16:9', '1:1'] as const;
export const MEDIA_RESOLUTIONS = ['480p', '720p', '1080p', '2160p'] as const;
export const MEDIA_EXPORT_FORMATS = ['mp4', 'mov', 'webm', 'gif'] as const;

export type MediaAspectRatio = (typeof MEDIA_ASPECT_RATIOS)[number];
export type MediaResolution = (typeof MEDIA_RESOLUTIONS)[number];
export type MediaExportFormat = (typeof MEDIA_EXPORT_FORMATS)[number];

export function isMediaAspectRatio(value: unknown): value is MediaAspectRatio {
  return typeof value === 'string' && (MEDIA_ASPECT_RATIOS as readonly string[]).includes(value);
}

export function isMediaResolution(value: unknown): value is MediaResolution {
  return typeof value === 'string' && (MEDIA_RESOLUTIONS as readonly string[]).includes(value);
}

export function isMediaExportFormat(value: unknown): value is MediaExportFormat {
  return typeof value === 'string' && (MEDIA_EXPORT_FORMATS as readonly string[]).includes(value);
}
