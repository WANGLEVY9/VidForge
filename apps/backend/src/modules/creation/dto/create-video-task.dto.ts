import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VideoAspectRatio, VideoResolution } from '@vidforge/common';
import { ExportFormat } from '../entities/video-task.entity';

export class CreateVideoTaskDto {
  @ApiProperty({ description: '视频任务名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '关联的剧本ID' })
  @IsUUID()
  scriptId: string;

  @ApiProperty({ description: '视频分辨率', enum: VideoResolution, required: false, default: VideoResolution.RESOLUTION_1080P })
  @IsOptional()
  @IsEnum(VideoResolution)
  resolution?: VideoResolution;

  @ApiProperty({ description: '视频比例', enum: VideoAspectRatio, required: false, default: VideoAspectRatio.RATIO_9_16 })
  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio?: VideoAspectRatio;

  @ApiProperty({ description: '导出格式', enum: ExportFormat, required: false, default: ExportFormat.MP4 })
  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;
}
