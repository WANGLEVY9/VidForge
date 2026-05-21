import { IsString, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStoryboardDto {
  @ApiProperty({ description: '分镜ID', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '分镜序号' })
  @IsNumber()
  index: number;

  @ApiProperty({ description: '画面描述' })
  @IsString()
  sceneDescription: string;

  @ApiProperty({ description: '镜头运动', required: false })
  @IsOptional()
  @IsString()
  cameraMovement?: string;

  @ApiProperty({ description: '台词/旁白', required: false })
  @IsOptional()
  @IsString()
  dialogue?: string;

  @ApiProperty({ description: '时长，单位秒' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'BGM要求', required: false })
  @IsOptional()
  @IsString()
  bgm?: string;

  @ApiProperty({ description: '字幕内容', required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ description: '视觉风格配置', required: false })
  @IsOptional()
  @IsObject()
  style?: Record<string, any>;
}

export class UpdateScriptStoryboardsDto {
  @ApiProperty({ description: '分镜列表', type: [UpdateStoryboardDto] })
  @IsArray()
  storyboards: UpdateStoryboardDto[];
}
