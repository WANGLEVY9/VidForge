import apiClient from '../utils/api';

export interface OverviewData {
  totalMaterials: number;
  totalScripts: number;
  totalCreations: number;
  todayCreations: number;
  successRate: number;
  avgDuration: number;
  momChanges: {
    materials: string;
    scripts: string;
    creations: string;
    successRate: string;
    avgDuration: string;
  };
}

export interface TrendPoint {
  date: string;
  count: number;
  successRate: number;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface QueueStatus {
  depth: number;
  processing: number;
  waiting: number;
  avgWaitTime: number;
  throughput: number;
}

export interface AttributionMatrix {
  factors: string[];
  levels: string[];
  data: number[][];
}

export interface TraceItem {
  taskId: string;
  totalDuration: number;
  nodes: Array<{ name: string; duration: number; status: string }>;
}

export interface CostOverview {
  /** 今日总调用数 */
  totalCalls: number;
  /** 今日总成本(美分) */
  totalCostCents: number;
  /** 今日总 token 数 */
  totalTokens: number;
  /** 缓存命中率 0-100 */
  cacheHitRate: number;
  /** 平均延迟 ms */
  avgLatencyMs: number;
}

export const analyticsApi = {
  getOverview(spaceId?: string) {
    return apiClient.get<any, OverviewData>('/analytics/overview', { params: { spaceId } });
  },
  getTrends(period?: string, spaceId?: string) {
    return apiClient.get<any, TrendPoint[]>('/analytics/trends', { params: { period, spaceId } });
  },
  getDistribution(spaceId?: string) {
    return apiClient.get<any, DistributionItem[]>('/analytics/distribution', { params: { spaceId } });
  },
  getQueueStatus() {
    return apiClient.get<any, QueueStatus>('/analytics/queue');
  },
  getAttribution() {
    return apiClient.get<any, AttributionMatrix>('/analytics/attribution');
  },
  getTraces() {
    return apiClient.get<any, TraceItem[]>('/analytics/traces');
  },
  /** 今日 Token / 成本 / 缓存命中率(V2 新增) */
  getCostOverview() {
    return apiClient.get<any, CostOverview>('/analytics/cost');
  },
};
