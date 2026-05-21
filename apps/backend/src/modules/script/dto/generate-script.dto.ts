import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VideoStyle } from '../entities/script.entity';

export class GenerateScriptDto {
  @ApiProperty({ description: '商品名称' })
  @IsString()
  productName: string;

  @ApiProperty({ description: '商品卖点', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  sellingPoints: string[];

  @ApiProperty({ description: '目标人群', required: false })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ description: '使用场景', required: false })
  @IsOptional()
  @IsString()
  scene?: string;

  @ApiProperty({ description: '视频风格', enum: VideoStyle, required: false })
  @IsOptional()
  @IsEnum(VideoStyle)
  style?: VideoStyle;

  @ApiProperty({ description: '总时长，单位秒，默认15s，最大60s', required: false, minimum: 5, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  totalDuration?: number;

  @ApiProperty({ description: '自定义Prompt，会覆盖系统默认Prompt', required: false })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiProperty({ description: '标签', type: [String], required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
