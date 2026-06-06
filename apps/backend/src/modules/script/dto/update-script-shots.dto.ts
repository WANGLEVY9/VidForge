import { IsArray, IsOptional, IsString, IsNumber } from 'class-validator';

class ShotItem {
  @IsNumber()
  index: number;

  @IsNumber()
  duration: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  voiceover?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  cameraMovement?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateScriptShotsDto {
  @IsArray()
  shots: ShotItem[];
}
