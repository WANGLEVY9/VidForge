import { IsOptional, IsString } from 'class-validator';

export class AnalyzeMaterialDto {
  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
