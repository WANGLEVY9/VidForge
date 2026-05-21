import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@ApiTags('数据看板')
@Controller('dashboard')
export class DashboardController {
  @Get('statistics')
  @ApiOperation({ summary: '获取统计数据' })
  @IsPublic()
  getStatistics() {
    // Mock数据
    return {
      totalMaterial: Math.floor(Math.random() * 1000) + 500,
      totalScript: Math.floor(Math.random() * 500) + 200,
      totalVideo: Math.floor(Math.random() * 300) + 100,
      totalDuration: Math.floor(Math.random() * 3600) + 1800, // 总时长秒
      avgGenerationTime: Math.floor(Math.random() * 120) + 60, // 平均生成时间秒
      successRate: (Math.random() * 0.2 + 0.8).toFixed(2), // 成功率80-100%
      todayGenerationCount: Math.floor(Math.random() * 50) + 10,
    };
  }

  @Get('video-trend')
  @ApiOperation({ summary: '获取视频生成趋势' })
  @IsPublic()
  getVideoTrend() {
    // 最近7天数据
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    });

    return days.map(day => ({
      date: day,
      count: Math.floor(Math.random() * 30) + 5,
      successCount: Math.floor(Math.random() * 25) + 5,
    }));
  }

  @Get('style-distribution')
  @ApiOperation({ summary: '获取视频风格分布' })
  @IsPublic()
  getStyleDistribution() {
    return [
      { name: '动感风', value: Math.floor(Math.random() * 100) + 50 },
      { name: '清新风', value: Math.floor(Math.random() * 80) + 30 },
      { name: '科技风', value: Math.floor(Math.random() * 70) + 20 },
      { name: '奢华风', value: Math.floor(Math.random() * 60) + 20 },
      { name: '复古风', value: Math.floor(Math.random() * 50) + 10 },
      { name: '写实风', value: Math.floor(Math.random() * 40) + 10 },
    ];
  }

  @Get('conversion-effect')
  @ApiOperation({ summary: '获取转化效果数据' })
  @IsPublic()
  getConversionEffect() {
    return [
      { name: '产品A', playRate: 0.65, clickRate: 0.12, conversionRate: 0.035, ctr: 0.02, cvr: 0.018 },
      { name: '产品B', playRate: 0.72, clickRate: 0.15, conversionRate: 0.042, ctr: 0.025, cvr: 0.022 },
      { name: '产品C', playRate: 0.58, clickRate: 0.09, conversionRate: 0.028, ctr: 0.018, cvr: 0.015 },
      { name: '产品D', playRate: 0.78, clickRate: 0.18, conversionRate: 0.051, ctr: 0.032, cvr: 0.028 },
      { name: '产品E', playRate: 0.62, clickRate: 0.11, conversionRate: 0.031, ctr: 0.021, cvr: 0.017 },
    ];
  }

  @Get('template-effect')
  @ApiOperation({ summary: '获取模板效果排行' })
  @IsPublic()
  getTemplateEffect() {
    return [
      { name: '爆款同款模板1', usageCount: 156, avgPlayRate: 0.72, avgConversion: 0.042, score: 92 },
      { name: '3秒Hook模板', usageCount: 142, avgPlayRate: 0.78, avgConversion: 0.038, score: 88 },
      { name: '场景展示模板', usageCount: 128, avgPlayRate: 0.68, avgConversion: 0.035, score: 85 },
      { name: '对比测评模板', usageCount: 98, avgPlayRate: 0.65, avgConversion: 0.039, score: 84 },
      { name: '开箱体验模板', usageCount: 87, avgPlayRate: 0.70, avgConversion: 0.033, score: 82 },
    ];
  }
}
