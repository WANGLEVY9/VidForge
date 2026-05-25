import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsEnum(['image', 'video', 'audio'])
  type: 'image' | 'video' | 'audio';

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  productSpaceId?: string;
}
