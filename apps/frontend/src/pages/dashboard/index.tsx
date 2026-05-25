import { useState, useEffect } from 'react';
import { Row, Col, Tag, Typography, List, Button, Space, Badge, Tooltip, Progress, Segmented } from 'antd';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart, HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { StudioHeader } from '../../components/studio/StudioHeader';
import { QueueStatus } from '../../components/dashboard/QueueStatus';
import { ChartPanel } from '../../components/dashboard/ChartPanel';
import { useShell } from '../../components/layout/shell-context';
import { analyticsApi } from '../../services/analytics';

echarts.use([BarChart, LineChart, PieChart, RadarChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, RadarComponent, CanvasRenderer]);

const { Text } = Typography;

const mockRecentTasks = [
  { id: 1, name: '夏季连衣裙推广视频', status: 'completed', duration: '00:45', createdAt: '10分钟前' },
  { id: 2, name: '蓝牙耳机开箱测评', status: 'processing', progress: 65, createdAt: '25分钟前' },
  { id: 3, name: '防晒霜使用教程', status: 'processing', progress: 30, createdAt: '1小时前' },
  { id: 4, name: '运动鞋上脚展示', status: 'completed', duration: '00:30', createdAt: '2小时前' },
  { id: 5, name: '护肤套装对比评测', status: 'failed', createdAt: '3小时前' },
];

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  processing: { color: 'processing', text: '生成中', icon: <SyncOutlined spin /> },
  failed: { color: 'error', text: '失败', icon: <ClockCircleOutlined /> },
  pending: { color: 'default', text: '排队中', icon: <ClockCircleOutlined /> },
};

const periodOptions = ['日', '周', '月', '自定义'];
const chartModes = ['折线', '柱状', '面积'];

function DashboardPage() {
  const { isMobile } = useShell();
  const chartHeight = isMobile ? 180 : 260;
  const smallChartHeight = isMobile ? 160 : 220;

  const [period, setPeriod] = useState('月');
  const [chartMode, setChartMode] = useState('折线');
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any>(null);

  useEffect(() => {
    analyticsApi.getOverview().then(setOverview).catch(() => {});
    analyticsApi.getTrends().then(setTrends).catch(() => {});
    analyticsApi.getDistribution().then(setDistribution).catch(() => {});
    analyticsApi.getAttribution().then(setAttribution).catch(() => {});
  }, []);

  const trendSeries = chartMode === '柱状' ? 'bar' : chartMode === '面积' ? 'line' : 'line';

  const trendOption = trends.length > 0 ? {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', textStyle: { color: 'var(--text-primary)' } },
    legend: { data: ['视频产出', '成功率(%)'], right: 0, top: 0, textStyle: { color: 'var(--text-secondary)' } },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: { type: 'category' as const, data: trends.map((t) => t.date.slice(5)), axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: [
      { type: 'value' as const, name: '产出量', splitLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
      { type: 'value' as const, name: '成功率 %', min: 0, max: 100, splitLine: { show: false }, axisLabel: { color: 'var(--text-tertiary)' } },
    ],
    series: [
      {
        name: '视频产出', type: trendSeries as any, data: trends.map((t) => t.count),
        smooth: true, lineStyle: { width: 3, color: '#6366f1' }, itemStyle: { color: '#6366f1' },
        areaStyle: chartMode === '面积' ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }]) } : undefined,
      },
      {
        name: '成功率(%)', type: 'line', yAxisIndex: 1, data: trends.map((t) => t.successRate),
        smooth: true, lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' },
      },
    ],
  } : {};

  const roseOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    legend: { orient: 'vertical' as const, right: 0, top: 'center', textStyle: { color: 'var(--text-secondary)' } },
    series: [{
      type: 'pie', radius: ['30%', '75%'], center: ['35%', '50%'], roseType: 'area' as const,
      itemStyle: { borderRadius: 4, borderColor: 'var(--bg-surface)', borderWidth: 2 },
      data: distribution.length > 0 ? distribution.map((d, i) => ({
        name: d.name, value: d.value,
        itemStyle: { color: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#3b82f6'][i] },
      })) : [],
    }],
  };

  const radarOption = {
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
    series: [{
      type: 'radar' as const,
      data: [
        { value: [92, 70, 88, 65, 85], name: 'Seedance Pro', itemStyle: { color: '#6366f1' }, areaStyle: { color: 'rgba(99,102,241,0.15)' } },
        { value: [78, 92, 82, 85, 72], name: 'Seedance Lite', itemStyle: { color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.15)' } },
      ],
    }],
  };

  const stackedBarOption = distribution.length > 0 ? {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    legend: { data: ['Pro 成功', 'Pro 失败', 'Lite 成功', 'Lite 失败'], textStyle: { color: 'var(--text-secondary)' } },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: { type: 'category' as const, data: distribution.map((d) => d.name), axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    series: [
      { name: 'Pro 成功', type: 'bar', stack: 'total', data: distribution.map((d) => Math.round(d.value * 0.7)), itemStyle: { color: '#6366f1' } },
      { name: 'Pro 失败', type: 'bar', stack: 'total', data: distribution.map((d) => Math.round(d.value * 0.1)), itemStyle: { color: 'rgba(99,102,241,0.3)' } },
      { name: 'Lite 成功', type: 'bar', stack: 'total', data: distribution.map((d) => Math.round(d.value * 0.15)), itemStyle: { color: '#10b981' } },
      { name: 'Lite 失败', type: 'bar', stack: 'total', data: distribution.map((d) => Math.round(d.value * 0.05)), itemStyle: { color: 'rgba(16,185,129,0.3)' } },
    ],
  } : {};

  const heatmapOption = attribution ? {
    tooltip: { position: 'top' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    grid: { left: 8, right: 8, bottom: 0, top: 0, containLabel: true },
    xAxis: { type: 'category' as const, data: attribution.levels, axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: { type: 'category' as const, data: attribution.factors, axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#1e293b', '#6366f1', '#a855f7', '#10b981'] } },
    series: [{
      type: 'heatmap' as const,
      data: attribution.data.flatMap((row: number[], i: number) => row.map((val: number, j: number) => [j, i, val])),
      label: { show: true, color: '#fff', fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  } : {};

  const traceOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    grid: { left: 8, right: 8, bottom: 0, top: 0, containLabel: true },
    xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: { type: 'category' as const, data: ['#V0422', '#V0421', '#V0420'], axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-primary)' } },
    series: [
      { name: '素材分析', type: 'bar', stack: 'total', data: [6.2, 5.1, 7.0], itemStyle: { color: '#6366f1' } },
      { name: '剧本生成', type: 'bar', stack: 'total', data: [12.1, 10.3, 11.5], itemStyle: { color: '#a855f7' } },
      { name: '视频合成', type: 'bar', stack: 'total', data: [12.5, 11.2, 15.0], itemStyle: { color: '#10b981' } },
      { name: '质量控制', type: 'bar', stack: 'total', data: [3.4, 2.8, 4.1], itemStyle: { color: '#f59e0b' } },
    ],
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <Text strong style={{ fontSize: 20, color: 'var(--text-primary)', display: 'block' }}>数据工作室</Text>
          <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>最近更新: 2 分钟前</Text>
        </div>
        <Space>
          <Segmented options={periodOptions} value={period} onChange={(v) => setPeriod(v as string)} size={isMobile ? 'small' : undefined} />
          <Button size="small">导出</Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        {[
          { title: '素材总量', value: overview?.totalMaterials ?? '—', change: overview?.momChanges.materials ?? '', icon: <UploadOutlined />, color: '#6366f1' },
          { title: '剧本总数', value: overview?.totalScripts ?? '—', change: overview?.momChanges.scripts ?? '', icon: <FileTextOutlined />, color: '#a855f7' },
          { title: '视频产出', value: overview?.totalCreations ?? '—', change: overview?.momChanges.creations ?? '', icon: <VideoCameraOutlined />, color: '#10b981' },
          { title: '今日新增', value: overview?.todayCreations ?? '—', change: '', icon: <ThunderboltOutlined />, color: '#f59e0b' },
          { title: '生成成功率', value: overview ? `${overview.successRate}%` : '—', change: overview?.momChanges.successRate ?? '', icon: <CheckCircleOutlined />, color: '#3b82f6' },
          { title: '平均耗时', value: overview ? `${overview.avgDuration}s` : '—', change: overview?.momChanges.avgDuration ?? '', icon: <ClockCircleOutlined />, color: '#ef4444' },
        ].slice(0, isMobile ? 4 : 6).map((stat, i) => (
          <Col xs={12} sm={8} md={4} key={i}>
            <GlassPanel variant="card" style={{ padding: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{stat.title}</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {stat.value}
                  </div>
                  {stat.change && (
                    <Text style={{ fontSize: 11, color: stat.change.startsWith('+') ? '#10b981' : '#ef4444' }}>
                      {stat.change} 较上月
                    </Text>
                  )}
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: `${stat.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: stat.color, fontSize: 16,
                }}>
                  {stat.icon}
                </div>
              </div>
            </GlassPanel>
          </Col>
        ))}
      </Row>

      {/* Trends + Distribution */}
      <Row gutter={[12, 12]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Col xs={24} lg={16}>
          <GlassPanel variant="card">
            <StudioHeader
              title="创作趋势"
              icon={<ThunderboltOutlined />}
              extra={
                <Space size={4}>
                  {(chartModes).map((m) => (
                    <Button key={m} size="small" type={chartMode === m ? 'primary' : 'text'} onClick={() => setChartMode(m)}>{m}</Button>
                  ))}
                </Space>
              }
            />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: chartHeight }} notMerge />
            </div>
            {!isMobile && (
              <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg)', display: 'flex', gap: 24 }}>
                <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>同比上期: +18%</Text>
                <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>环比上周: +5%</Text>
                <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>预测月末: 1,050</Text>
              </div>
            )}
          </GlassPanel>
        </Col>
        <Col xs={24} lg={8}>
          <ChartPanel title="Agent 任务分布" icon={<SyncOutlined />} option={roseOption} height={smallChartHeight} />
        </Col>
      </Row>

      {/* Radar + Stacked Bar */}
      <Row gutter={[12, 12]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Col xs={24} lg={8}>
          <ChartPanel title="模型性能对比" icon={<RocketOutlined />} option={radarOption} height={smallChartHeight} />
        </Col>
        <Col xs={24} lg={16}>
          <ChartPanel title="品类 × 模型 × 成功率" icon={<VideoCameraOutlined />} option={stackedBarOption} height={smallChartHeight} />
        </Col>
      </Row>

      {/* Queue + Attribution */}
      <Row gutter={[12, 12]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Col xs={24} lg={8}>
          <GlassPanel variant="card">
            <StudioHeader title="生成队列实时状态" icon={<ClockCircleOutlined />} />
            <QueueStatus />
          </GlassPanel>
        </Col>
        <Col xs={24} lg={16}>
          <ChartPanel title="因子归因矩阵" icon={<RocketOutlined />} option={heatmapOption} height={isMobile ? 160 : 220} />
        </Col>
      </Row>

      {/* Trace Waterfall */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <ChartPanel title="任务追踪瀑布图 (Trace View)" icon={<SyncOutlined />} option={traceOption} height={isMobile ? 120 : 160} extra={<Button type="link" size="small" icon={<RightOutlined />} style={{ color: 'var(--brand-primary)' }}>查看全部</Button>} />
      </div>

      {/* Recent Tasks */}
      <GlassPanel variant="card">
        <StudioHeader
          title="最近创作"
          icon={<ClockCircleOutlined />}
          extra={<Button type="link" icon={<RightOutlined />} style={{ color: 'var(--brand-primary)' }}>查看全部</Button>}
        />
        <List
          dataSource={mockRecentTasks}
          renderItem={(task: any) => {
            const st = statusMap[task.status];
            return (
              <List.Item
                style={{
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                actions={[
                  task.status === 'completed' && (
                    <Tooltip title="预览视频" key="preview">
                      <Button type="text" icon={<PlayCircleOutlined />} style={{ color: 'var(--brand-primary)' }} />
                    </Tooltip>
                  ),
                  <Tooltip title="重新生成" key="retry">
                    <Button type="text" icon={<SyncOutlined />} style={{ color: 'var(--text-secondary)' }} />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<Badge status={st.color as any} />}
                  title={
                    <Space>
                      <Text strong style={{ color: 'var(--text-primary)' }}>{task.name}</Text>
                      <Tag color={st.color} icon={st.icon} style={{ borderRadius: 20, fontSize: 12 }}>{st.text}</Tag>
                    </Space>
                  }
                  description={
                    <Space size={16}>
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{task.createdAt}</Text>
                      {task.status === 'completed' && <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>时长 {task.duration}</Text>}
                      {task.status === 'processing' && <Progress percent={task.progress} size="small" style={{ width: 120 }} strokeColor="#6366f1" />}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </GlassPanel>
    </div>
  );
}

export default DashboardPage;
