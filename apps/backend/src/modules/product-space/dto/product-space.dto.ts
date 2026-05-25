import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
