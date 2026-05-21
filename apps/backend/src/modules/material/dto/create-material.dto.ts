import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '../entities/material.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiProperty({ enum: MaterialType, description: '素材类型' })
  @IsEnum(MaterialType)
  type: MaterialType;

  @ApiProperty({ description: '素材名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '标签', required: false })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
