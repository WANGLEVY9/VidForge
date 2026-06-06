import { IsOptional, IsString, IsEnum, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMaterialDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['image', 'video', 'audio'])
  type?: 'image' | 'video' | 'audio';

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'size', 'updatedAt'])
  orderBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  orderDirection?: 'ASC' | 'DESC' = 'DESC';
}
