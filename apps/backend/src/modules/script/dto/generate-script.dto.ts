import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateScriptDto {
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
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  duration?: number;

  @IsOptional()
  @IsString()
  productSpaceId?: string;
}
