import { useState, useEffect, useCallback } from 'react';
import {
  analyticsApi,
  type OverviewData,
  type TrendPoint,
  type DistributionItem,
  type AttributionMatrix,
  type TraceItem,
} from '../services/analytics';
import { creationApi, type CreationTask } from '../services/creation';

export interface DashboardDataState {
  overview: OverviewData | null;
  trends: TrendPoint[];
  distribution: DistributionItem[];
  attribution: AttributionMatrix | null;
  traces: TraceItem[];
  recentTasks: CreationTask[];
  loading: {
    overview: boolean;
    trends: boolean;
    distribution: boolean;
    attribution: boolean;
    traces: boolean;
    recentTasks: boolean;
  };
  errors: {
    overview: boolean;
    trends: boolean;
    distribution: boolean;
    attribution: boolean;
    traces: boolean;
    recentTasks: boolean;
  };
  lastUpdated: Date | null;
}

const initialLoading = {
  overview: true,
  trends: true,
  distribution: true,
  attribution: true,
  traces: true,
  recentTasks: true,
};

const initialErrors = {
  overview: false,
  trends: false,
  distribution: false,
  attribution: false,
  traces: false,
  recentTasks: false,
};

export function useDashboardData(
  spaceId?: string,
  period: string = '月',
  refreshIntervalMs: number = 30000
) {
  const [state, setState] = useState<DashboardDataState>({
    overview: null,
    trends: [],
    distribution: [],
    attribution: null,
    traces: [],
    recentTasks: [],
    loading: { ...initialLoading },
    errors: { ...initialErrors },
    lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev: DashboardDataState) => ({
      ...prev,
      loading: { ...initialLoading },
      errors: { ...initialErrors },
    }));

    const periodMap: Record<string, string> = { 日: 'day', 周: 'week', 月: 'month' };
    const periodParam = periodMap[period] ?? 'month';

    const results = await Promise.allSettled([
      analyticsApi.getOverview(spaceId),
      analyticsApi.getTrends(periodParam, spaceId),
      analyticsApi.getDistribution(spaceId),
      analyticsApi.getAttribution(),
      analyticsApi.getTraces(),
      creationApi.getList(spaceId),
    ]);

    const [overviewRes, trendsRes, distributionRes, attributionRes, tracesRes, tasksRes] = results;

    setState({
      overview: overviewRes.status === 'fulfilled' ? overviewRes.value : null,
      trends: trendsRes.status === 'fulfilled' ? trendsRes.value : [],
      distribution: distributionRes.status === 'fulfilled' ? distributionRes.value : [],
      attribution: attributionRes.status === 'fulfilled' ? attributionRes.value : null,
      traces: tracesRes.status === 'fulfilled' ? tracesRes.value : [],
      recentTasks: tasksRes.status === 'fulfilled' ? (tasksRes.value ?? []) : [],
      loading: {
        overview: false,
        trends: false,
        distribution: false,
        attribution: false,
        traces: false,
        recentTasks: false,
      },
      errors: {
        overview: overviewRes.status === 'rejected',
        trends: trendsRes.status === 'rejected',
        distribution: distributionRes.status === 'rejected',
        attribution: attributionRes.status === 'rejected',
        traces: tracesRes.status === 'rejected',
        recentTasks: tasksRes.status === 'rejected',
      },
      lastUpdated: new Date(),
    });
  }, [spaceId, period]);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [fetchAll, refreshIntervalMs, period]);

  const refresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...state, refresh };
}
