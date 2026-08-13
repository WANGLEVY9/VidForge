import { IsString, IsOptional, IsArray, IsBoolean, IsIn } from 'class-validator';
import { MEDIA_ASPECT_RATIOS, MEDIA_RESOLUTIONS } from '../../media/media-pipeline.config';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  scriptId?: string;

  @IsOptional()
  @IsString()
  productSpaceId?: string;

  @IsOptional()
  @IsArray()
  storyboard?: Record<string, any>[];

  @IsOptional()
  modelKey?: string;

  @IsOptional()
  @IsIn(MEDIA_ASPECT_RATIOS)
  aspectRatio?: string;

  @IsOptional()
  @IsIn(MEDIA_RESOLUTIONS)
  quality?: string;

  /** 用于 BGM 风格匹配,与 Script.style 对齐 */
  @IsOptional()
  @IsString()
  style?: string;

  /** 是否烧录字幕到成片(默认 true) */
  @IsOptional()
  @IsBoolean()
  burnSubtitle?: boolean;
}
