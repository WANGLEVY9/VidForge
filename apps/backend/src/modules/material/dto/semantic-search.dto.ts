import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  similarityThreshold?: number = 0.7;
}
