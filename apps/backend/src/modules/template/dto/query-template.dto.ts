import { IsOptional, IsString } from 'class-validator';

export class QueryTemplateDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  style?: string;
}
