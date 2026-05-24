import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RunAgentDto {
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
  @IsNumber()
  duration?: number;
}
