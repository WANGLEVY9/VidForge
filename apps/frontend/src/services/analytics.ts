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

export const analyticsApi = {
  getOverview() {
    return apiClient.get<any, OverviewData>('/analytics/overview');
  },
  getTrends(period?: string) {
    return apiClient.get<any, TrendPoint[]>('/analytics/trends', { params: { period } });
  },
  getDistribution() {
    return apiClient.get<any, DistributionItem[]>('/analytics/distribution');
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
};
