import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('数据统计')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '概览指标卡片（按当前用户隔离）' })
  getOverview(@CurrentUser() user: JwtPayload, @Query('spaceId') spaceId?: string) {
    return this.analyticsService.getOverview(user.sub, spaceId);
  }

  @Get('trends')
  @ApiOperation({ summary: '创作趋势' })
  getTrends(@CurrentUser() user: JwtPayload, @Query('period') period: string = 'month') {
    void user;
    return this.analyticsService.getTrends(period);
  }

  @Get('distribution')
  @ApiOperation({ summary: '品类分布' })
  getDistribution() {
    return this.analyticsService.getDistribution();
  }

  @Get('queue')
  @ApiOperation({ summary: '队列状态' })
  getQueueStatus() {
    return this.analyticsService.getQueueStatus();
  }

  @Get('attribution')
  @ApiOperation({ summary: '因子归因矩阵' })
  getAttribution() {
    return this.analyticsService.getAttribution();
  }

  @Get('traces')
  @ApiOperation({ summary: '任务追踪瀑布图' })
  getTraces() {
    return this.analyticsService.getTraces();
  }
}
