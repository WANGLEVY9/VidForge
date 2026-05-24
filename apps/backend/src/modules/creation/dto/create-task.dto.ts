import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  scriptId?: string;

  @IsOptional()
  @IsArray()
  storyboard?: Record<string, any>[];

  @IsOptional()
  modelKey?: string;

  @IsOptional()
  aspectRatio?: string;

  @IsOptional()
  quality?: string;
}
