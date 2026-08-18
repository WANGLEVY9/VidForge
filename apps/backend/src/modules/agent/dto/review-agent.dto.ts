import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewAgentDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  feedback?: string;
}
