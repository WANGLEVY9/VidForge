import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsArray()
  shots: Record<string, any>[];

  @IsOptional()
  @IsString()
  voiceover?: string;

  @IsOptional()
  @IsString()
  bgmSuggestion?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  duration?: number;

  @IsOptional()
  @IsString()
  sourceScriptId?: string;
}
