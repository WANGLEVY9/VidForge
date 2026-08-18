import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

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

  /** 当前用户(由 controller 注入,非前端传) */
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  productSpaceId?: string;

  /** Pause after script generation until an authenticated human approves it. */
  @IsOptional()
  @IsBoolean()
  requireHumanReview?: boolean;
}
