import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: '接收者 userId,留空则为系统广播' })
  @IsOptional()
  @IsString()
  userId?: string | null;

  @ApiProperty({ enum: ['system', 'task', 'compliance', 'tip'] })
  @IsIn(['system', 'task', 'compliance', 'tip'])
  type: NotificationType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}

export class ListNotificationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'true 时仅返回未读 personal 通知(广播仍带回)',
  })
  @IsOptional()
  unread?: string;
}
