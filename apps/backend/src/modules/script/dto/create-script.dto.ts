import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateScriptDto {
  @IsString()
  title: string;

  @IsString()
  productName: string;

  @IsString()
  category: string;

  @IsString()
  sellingPoints: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsArray()
  storyboard?: Record<string, any>[];

  @IsOptional()
  @IsString()
  voiceover?: string;

  @IsOptional()
  @IsString()
  bgmSuggestion?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  duration?: number;
}
