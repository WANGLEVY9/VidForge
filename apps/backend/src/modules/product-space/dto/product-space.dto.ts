import { IsOptional, IsString, MaxLength, MinLength, IsArray, IsIn } from 'class-validator';

export class ProductKnowledgeDto {
  @IsOptional()
  @IsArray()
  sellingPoints?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(280)
  targetAudience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  brandVoice?: string;

  @IsOptional()
  @IsIn(['亲民', '中端', '高端'])
  priceRange?: '亲民' | '中端' | '高端';

  @IsOptional()
  @IsArray()
  forbiddenWords?: string[];
}

export class CreateProductSpaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  knowledge?: ProductKnowledgeDto;
}

export class UpdateProductSpaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  knowledge?: ProductKnowledgeDto;
}
