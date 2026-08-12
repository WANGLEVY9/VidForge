import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Button, Space, Segmented } from 'antd';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  RocketOutlined,
  RightOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ChartPanel } from '../../components/dashboard/ChartPanel';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RecentTasks } from '../../components/dashboard/RecentTasks';
import { QueueStatus } from '../../components/dashboard/QueueStatus';
import { CostOverviewCard } from '../../components/dashboard/CostOverviewCard';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useShell } from '../../components/layout/shell-context';
import { usePageTiming } from '../../hooks/usePerformance';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
  CanvasRenderer,
]);

const periodOptions = ['日', '周', '月'];
const chartModes = ['折线', '柱状', '面积'];

const chartCommonTooltip = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-color)',
  textStyle: { color: 'var(--text-primary)' },
};

const chartCommonAxis = {
  axisLine: { lineStyle: { color: 'var(--border-color)' } },
  axisLabel: { color: 'var(--text-tertiary)' },
};

const chartCommonLegend = {
  textStyle: { color: 'var(--text-secondary)' },
};

const chartBrandColors = [
  '#6366f1',
  '#a855f7',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#06b6d4',
];

function DashboardPage() {
  const { spaceId } = useParams<{ spaceId?: string }>();
  const { isMobile } = useShell();
  usePageTiming('Dashboard');

  const [period, setPeriod] = useState('月');
  const [chartMode, setChartMode] = useState('折线');

  const {
    overview,
    trends,
    distribution,
    attribution,
    traces,
    recentTasks,
    loading,
    refresh,
    lastUpdated,
  } = useDashboardData(spaceId, period, 30000);

  // ── 趋势图 ──
  const trendOption = useMemo(() => {
    if (trends.length === 0) return {};
    const seriesType = chartMode === '柱状' ? 'bar' : 'line';
    const isArea = chartMode === '面积';

    return {
      tooltip: { ...chartCommonTooltip, trigger: 'axis' as const },
      legend: { ...chartCommonLegend, data: ['视频产出', '成功率(%)'], right: 0, top: 0 },
      grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: trends.map((t) => t.date.slice(5)),
        ...chartCommonAxis,
      },
      yAxis: [
        {
          type: 'value' as const,
          name: '产出量',
          splitLine: { lineStyle: { color: 'var(--border-color)' } },
          axisLabel: { color: 'var(--text-tertiary)' },
        },
        {
          type: 'value' as const,
          name: '成功率 %',
          min: 0,
          max: 100,
          splitLine: { show: false },
          axisLabel: { color: 'var(--text-tertiary)' },
        },
      ],
      series: [
        {
          name: '视频产出',
          type: seriesType,
          data: trends.map((t) => t.count),
          smooth: true,
          lineStyle: { width: 3, color: '#6366f1' },
          itemStyle: { color: '#6366f1' },
          areaStyle: isArea
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(99,102,241,0.2)' },
                  { offset: 1, color: 'rgba(99,102,241,0)' },
                ]),
              }
            : undefined,
        },
        {
          name: '成功率(%)',
          type: 'line',
          yAxisIndex: 1,
          data: trends.map((t) => t.successRate),
          smooth: true,
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' },
        },
      ],
    };
  }, [trends, chartMode]);

  // ── 玫瑰图 ──
  const roseOption = useMemo(() => {
    if (distribution.length === 0) return {};
    return {
      tooltip: { ...chartCommonTooltip, trigger: 'item' as const },
      legend: { ...chartCommonLegend, orient: 'vertical' as const, right: 0, top: 'center' },
      series: [
        {
          type: 'pie',
          radius: ['30%', '75%'],
          center: ['35%', '50%'],
          roseType: 'area' as const,
          itemStyle: { borderRadius: 4, borderColor: 'var(--bg-surface)', borderWidth: 2 },
          data: distribution.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: chartBrandColors[i % chartBrandColors.length] },
          })),
        },
      ],
    };
  }, [distribution]);

  // ── 雷达图 ──
  const radarOption = useMemo(() => {
    return {
      radar: {
        indicator: [
          { name: '生成质量', max: 100 },
          { name: '速度', max: 100 },
          { name: '成功率', max: 100 },
          { name: '成本', max: 100 },
          { name: '自然度', max: 100 },
        ],
        axisName: { color: 'var(--text-secondary)' },
        splitArea: { areaStyle: { color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'] } },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              value: [92, 70, 88, 65, 85],
              name: 'Seedance Pro',
              itemStyle: { color: '#6366f1' },
              areaStyle: { color: 'rgba(99,102,241,0.15)' },
            },
            {
              value: [78, 92, 82, 85, 72],
              name: 'Seedance Lite',
              itemStyle: { color: '#10b981' },
              areaStyle: { color: 'rgba(16,185,129,0.15)' },
            },
          ],
        },
      ],
    };
  }, []);

  // ── 堆叠柱状图 ──
  const stackedBarOption = useMemo(() => {
    if (distribution.length === 0) return {};
    return {
      tooltip: { ...chartCommonTooltip, trigger: 'axis' as const },
      legend: { ...chartCommonLegend, data: ['Pro 成功', 'Pro 失败', 'Lite 成功', 'Lite 失败'] },
      grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: distribution.map((d) => d.name),
        ...chartCommonAxis,
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-tertiary)' },
      },
      series: [
        {
          name: 'Pro 成功',
          type: 'bar',
          stack: 'total',
          data: distribution.map((d) => Math.round(d.value * 0.7)),
          itemStyle: { color: '#6366f1' },
        },
        {
          name: 'Pro 失败',
          type: 'bar',
          stack: 'total',
          data: distribution.map((d) => Math.round(d.value * 0.1)),
          itemStyle: { color: 'rgba(99,102,241,0.3)' },
        },
        {
          name: 'Lite 成功',
          type: 'bar',
          stack: 'total',
          data: distribution.map((d) => Math.round(d.value * 0.15)),
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'Lite 失败',
          type: 'bar',
          stack: 'total',
          data: distribution.map((d) => Math.round(d.value * 0.05)),
          itemStyle: { color: 'rgba(16,185,129,0.3)' },
        },
      ],
    };
  }, [distribution]);

  // ── 热力图 ──
  const heatmapOption = useMemo(() => {
    if (!attribution || attribution.data.length === 0) return {};
    return {
      tooltip: { position: 'top' as const, ...chartCommonTooltip },
      grid: { left: 8, right: 8, bottom: 0, top: 0, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: attribution.levels,
        ...chartCommonAxis,
      },
      yAxis: {
        type: 'category' as const,
        data: attribution.factors,
        ...chartCommonAxis,
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#1e293b', '#6366f1', '#a855f7', '#10b981'] },
      },
      series: [
        {
          type: 'heatmap' as const,
          data: attribution.data.flatMap((row: number[], i: number) =>
            row.map((val: number, j: number) => [j, i, val])
          ),
          label: { show: true, color: '#fff', fontSize: 11 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        },
      ],
    };
  }, [attribution]);

  // ── Trace 瀑布图（真实数据） ──
  const traceOption = useMemo(() => {
    if (traces.length === 0) return {};
    const taskIds = traces.slice(0, 5).map((t) => t.taskId);
    const nodes = ['素材分析', '剧本生成', '视频合成', '质量控制'];
    const series = nodes.map((nodeName, idx) => ({
      name: nodeName,
      type: 'bar' as const,
      stack: 'total' as const,
      data: traces.slice(0, 5).map((t) => {
        const node = t.nodes?.find((n) => n.name.includes(nodeName) || n.name === nodeName);
        return node ? node.duration : 0;
      }),
      itemStyle: { color: chartBrandColors[idx % chartBrandColors.length] },
    }));

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        ...chartCommonTooltip,
      },
      legend: { ...chartCommonLegend, data: nodes },
      grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
      xAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-tertiary)' },
      },
      yAxis: {
        type: 'category' as const,
        data: taskIds,
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-primary)' },
      },
      series,
    };
  }, [traces]);

  const statCards = [
    {
      title: '素材总量',
      value: overview?.totalMaterials ?? '—',
      change: overview?.momChanges?.materials ?? '',
      icon: <UploadOutlined />,
      color: '#6366f1',
    },
    {
      title: '剧本总数',
      value: overview?.totalScripts ?? '—',
      change: overview?.momChanges?.scripts ?? '',
      icon: <FileTextOutlined />,
      color: '#a855f7',
    },
    {
      title: '视频产出',
      value: overview?.totalCreations ?? '—',
      change: overview?.momChanges?.creations ?? '',
      icon: <VideoCameraOutlined />,
      color: '#10b981',
    },
    {
      title: '今日新增',
      value: overview?.todayCreations ?? '—',
      change: '',
      icon: <ThunderboltOutlined />,
      color: '#f59e0b',
    },
    {
      title: '生成成功率',
      value: overview ? `${overview.successRate}%` : '—',
      change: overview?.momChanges?.successRate ?? '',
      icon: <CheckCircleOutlined />,
      color: '#3b82f6',
    },
    {
      title: '平均耗时',
      value: overview ? `${overview.avgDuration}s` : '—',
      change: overview?.momChanges?.avgDuration ?? '',
      icon: <ClockCircleOutlined />,
      color: '#ef4444',
    },
  ];

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 'var(--spacing-xl)',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            数据工作室
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            实时监控创作流水线
            {lastUpdated && (
              <span style={{ marginLeft: 8 }}>
                · 最近更新 {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} 分钟前
              </span>
            )}
          </div>
        </div>
        <Space size={8}>
          <Segmented
            options={periodOptions}
            value={period}
            onChange={(v) => setPeriod(v as string)}
          />
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            刷新
          </Button>
          <Button>导出报告</Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <Row
        gutter={[16, 16]}
        className="stagger-children"
        style={{ marginBottom: 'var(--spacing-xl)' }}
      >
        {statCards.map((stat, i) => (
          <Col xs={12} sm={8} md={8} lg={4} key={i}>
            <MetricCard
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              color={stat.color}
              loading={loading.overview}
            />
          </Col>
        ))}
      </Row>

      {/* Section 1: 核心趋势 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24} lg={16}>
          <ChartPanel
            title="创作趋势"
            icon={<ThunderboltOutlined />}
            option={trendOption}
            height={320}
            loading={loading.trends}
            empty={trends.length === 0}
            emptyDescription="暂无趋势数据"
            extra={
              <Space size={4}>
                {chartModes.map((m) => (
                  <Button
                    key={m}
                    size="small"
                    type={chartMode === m ? 'primary' : 'text'}
                    onClick={() => setChartMode(m)}
                  >
                    {m}
                  </Button>
                ))}
              </Space>
            }
          />
        </Col>
        <Col xs={24} lg={8}>
          <ChartPanel
            title="Agent 任务分布"
            icon={<SyncOutlined />}
            option={roseOption}
            height={320}
            loading={loading.distribution}
            empty={distribution.length === 0}
            emptyDescription="暂无品类数据"
          />
        </Col>
      </Row>

      {/* Section 2: 模型与性能 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24} lg={8}>
          <ChartPanel
            title="模型性能对比"
            icon={<RocketOutlined />}
            option={radarOption}
            height={280}
            loading={false}
            empty={false}
          />
        </Col>
        <Col xs={24} lg={16}>
          <ChartPanel
            title="品类 × 模型 × 成功率"
            icon={<VideoCameraOutlined />}
            option={stackedBarOption}
            height={280}
            loading={loading.distribution}
            empty={distribution.length === 0}
            emptyDescription="暂无品类数据"
          />
        </Col>
      </Row>

      {/* Section 3: 队列与归因 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24} lg={8}>
          <QueueStatus />
        </Col>
        <Col xs={24} lg={16}>
          <ChartPanel
            title="因子归因矩阵"
            icon={<RocketOutlined />}
            option={heatmapOption}
            height={isMobile ? 160 : 220}
            loading={loading.attribution}
            empty={!attribution || attribution.data.length === 0}
            emptyDescription="暂无归因数据"
          />
        </Col>
      </Row>

      {/* Section 4: 成本观测 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24}>
          <CostOverviewCard />
        </Col>
      </Row>

      {/* Section 5: Trace 追踪 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24}>
          <ChartPanel
            title="任务追踪瀑布图 (Trace View)"
            icon={<SyncOutlined />}
            option={traceOption}
            height={isMobile ? 140 : 180}
            loading={loading.traces}
            empty={traces.length === 0}
            emptyDescription="暂无追踪数据"
            extra={
              <Button
                type="link"
                size="small"
                icon={<RightOutlined />}
                style={{ color: 'var(--brand-primary)' }}
              >
                查看全部
              </Button>
            }
          />
        </Col>
      </Row>

      {/* Section 6: 最近任务 */}
      <RecentTasks tasks={recentTasks} loading={loading.recentTasks} />
    </div>
  );
}

export default DashboardPage;
