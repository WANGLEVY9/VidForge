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
  @ApiOperation({ summary: '概览指标卡片(按当前用户隔离)' })
  getOverview(@CurrentUser() user: JwtPayload, @Query('spaceId') spaceId?: string) {
    return this.analyticsService.getOverview(user.sub, spaceId);
  }

  @Get('trends')
  @ApiOperation({ summary: '创作趋势(真实 PG 聚合)' })
  getTrends(
    @CurrentUser() user: JwtPayload,
    @Query('period') period: string = 'month',
    @Query('spaceId') spaceId?: string,
  ) {
    return this.analyticsService.getTrends(period, user.sub, spaceId);
  }

  @Get('distribution')
  @ApiOperation({ summary: '品类分布(按素材 category 真实聚合)' })
  getDistribution(@CurrentUser() user: JwtPayload, @Query('spaceId') spaceId?: string) {
    return this.analyticsService.getDistribution(user.sub, spaceId);
  }

  @Get('queue')
  @ApiOperation({ summary: '队列状态(BullMQ 真实计数)' })
  getQueueStatus() {
    return this.analyticsService.getQueueStatus();
  }

  @Get('attribution')
  @ApiOperation({ summary: '风格 × 任务状态归因(真实)' })
  getAttribution(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getAttribution(user.sub);
  }

  @Get('traces')
  @ApiOperation({ summary: '任务追踪瀑布图(从 trace_spans 表读)' })
  getTraces() {
    return this.analyticsService.getTraces();
  }

  @Get('cost')
  @ApiOperation({ summary: '今日 Token / 成本 / 缓存命中率' })
  getCostOverview() {
    return this.analyticsService.getCostOverview();
  }
}
