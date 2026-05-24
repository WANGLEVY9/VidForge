import { IsString, IsOptional, IsObject } from 'class-validator';

export class RegenerateShotDto {
  @IsString()
  shotId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  overrides?: Record<string, any>;
}
