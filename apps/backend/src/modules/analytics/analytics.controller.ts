import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('数据统计')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '概览指标卡片' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('trends')
  @ApiOperation({ summary: '创作趋势' })
  getTrends(@Query('period') period: string = 'month') {
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
