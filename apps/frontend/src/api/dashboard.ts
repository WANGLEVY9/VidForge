import request from '@/utils/request';

export interface StatisticsData {
  totalMaterial: number;
  totalScript: number;
  totalVideo: number;
  totalDuration: number;
  avgGenerationTime: number;
  successRate: string;
  todayGenerationCount: number;
}

export interface TrendItem {
  date: string;
  count: number;
  successCount: number;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface ConversionItem {
  name: string;
  playRate: number;
  clickRate: number;
  conversionRate: number;
  ctr: number;
  cvr: number;
}

export interface TemplateItem {
  name: string;
  usageCount: number;
  avgPlayRate: number;
  avgConversion: number;
  score: number;
}

// 获取统计数据
export function getStatistics(): Promise<StatisticsData> {
  return request.get('/dashboard/statistics');
}

// 获取视频生成趋势
export function getVideoTrend(): Promise<TrendItem[]> {
  return request.get('/dashboard/video-trend');
}

// 获取视频风格分布
export function getStyleDistribution(): Promise<DistributionItem[]> {
  return request.get('/dashboard/style-distribution');
}

// 获取转化效果数据
export function getConversionEffect(): Promise<ConversionItem[]> {
  return request.get('/dashboard/conversion-effect');
}

// 获取模板效果排行
export function getTemplateEffect(): Promise<TemplateItem[]> {
  return request.get('/dashboard/template-effect');
}
