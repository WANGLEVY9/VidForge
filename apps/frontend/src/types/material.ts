export enum MaterialType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export const MaterialTypeText = {
  [MaterialType.IMAGE]: '图片',
  [MaterialType.VIDEO]: '视频',
  [MaterialType.AUDIO]: '音频',
};

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  duration?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
