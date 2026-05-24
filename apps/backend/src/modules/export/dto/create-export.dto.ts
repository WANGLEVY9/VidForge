import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateExportDto {
  @IsString()
  creationTaskId: string;

  @IsOptional()
  @IsIn(['mp4', 'mov', 'webm', 'gif'])
  format?: string = 'mp4';

  @IsOptional()
  @IsIn(['2160p', '1080p', '720p', '480p'])
  resolution?: string = '1080p';

  @IsOptional()
  embedSubtitles?: boolean = true;

  @IsOptional()
  keepIndividualShots?: boolean = false;

  @IsOptional()
  generateThumbnail?: boolean = true;
}
