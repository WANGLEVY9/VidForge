import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { MEDIA_EXPORT_FORMATS, MEDIA_RESOLUTIONS } from '../../media/media-pipeline.config';

export class CreateExportDto {
  @IsString()
  creationTaskId: string;

  @IsOptional()
  @IsIn(MEDIA_EXPORT_FORMATS)
  format?: string = 'mp4';

  @IsOptional()
  @IsIn(MEDIA_RESOLUTIONS)
  resolution?: string = '1080p';

  @IsOptional()
  @IsBoolean()
  embedSubtitles?: boolean = true;

  @IsOptional()
  @IsBoolean()
  keepIndividualShots?: boolean = false;

  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean = true;
}
