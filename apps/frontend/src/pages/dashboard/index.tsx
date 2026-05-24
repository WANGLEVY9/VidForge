import { Row, Col, Tag, Typography, List, Button, Space, Badge, Tooltip, Progress } from 'antd';
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
  BulbOutlined,
  FireOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { StudioHeader } from '../../components/studio/StudioHeader';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const mockStats = {
  materials: 128,
  scripts: 56,
  videos: 34,
  todayCreated: 8,
};

const mockTrend = {
  dates: ['05/18', '05/19', '05/20', '05/21', '05/22', '05/23', '05/24'],
  videos: [3, 5, 2, 8, 6, 4, 8],
  scripts: [5, 8, 4, 12, 9, 7, 10],
};

const mockRecentTasks = [
  { id: 1, name: '夏季连衣裙推广视频', status: 'completed', duration: '00:45', createdAt: '10分钟前' },
  { id: 2, name: '蓝牙耳机开箱测评', status: 'processing', progress: 65, createdAt: '25分钟前' },
  { id: 3, name: '防晒霜使用教程', status: 'processing', progress: 30, createdAt: '1小时前' },
  { id: 4, name: '运动鞋上脚展示', status: 'completed', duration: '00:30', createdAt: '2小时前' },
  { id: 5, name: '护肤套装对比评测', status: 'failed', createdAt: '3小时前' },
];

const quickActions = [
  { icon: <RocketOutlined />, label: '快速创作', desc: '一键生成带货视频', color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
  { icon: <BulbOutlined />, label: '智能剧本', desc: 'AI 生成营销文案', color: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' },
  { icon: <UploadOutlined />, label: '批量上传', desc: '素材批量管理', color: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
  { icon: <FireOutlined />, label: '热门模板', desc: '爆款视频模板库', color: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
];

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  processing: { color: 'processing', text: '生成中', icon: <SyncOutlined spin /> },
  failed: { color: 'error', text: '失败', icon: <ClockCircleOutlined /> },
  pending: { color: 'default', text: '排队中', icon: <ClockCircleOutlined /> },
};

function DashboardPage() {
  const trendOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', textStyle: { color: 'var(--text-primary)' } },
    legend: { data: ['视频产出', '剧本生成'], right: 0, top: 0, textStyle: { color: 'var(--text-secondary)' } },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: { type: 'category' as const, data: mockTrend.dates, axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    series: [
      { name: '视频产出', type: 'line', data: mockTrend.videos, smooth: true, lineStyle: { width: 3, color: '#6366f1' }, itemStyle: { color: '#6366f1' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }]) } },
      { name: '剧本生成', type: 'line', data: mockTrend.scripts, smooth: true, lineStyle: { width: 3, color: '#a855f7' }, itemStyle: { color: '#a855f7' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(168,85,247,0.15)' }, { offset: 1, color: 'rgba(168,85,247,0)' }]) } },
    ],
  };

  const pieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    legend: { orient: 'vertical' as const, right: 0, top: 'center', textStyle: { color: 'var(--text-secondary)' } },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: 'var(--bg-surface)', borderWidth: 3 },
      label: { show: false },
      data: [
        { value: 15, name: '服饰鞋包', itemStyle: { color: '#6366f1' } },
        { value: 10, name: '美妆护肤', itemStyle: { color: '#a855f7' } },
        { value: 5, name: '数码3C', itemStyle: { color: '#10b981' } },
        { value: 3, name: '食品饮料', itemStyle: { color: '#f59e0b' } },
        { value: 1, name: '家居生活', itemStyle: { color: '#3b82f6' } },
      ],
    }],
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 欢迎区 — 渐变背景 */}
      <GlassPanel
        variant="card"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #d946ef 100%)',
          padding: 'var(--spacing-xxl) var(--spacing-xxxl)',
          marginBottom: 'var(--spacing-xl)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
        }}
      >
        <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Text strong style={{ fontSize: 24, color: '#fff', display: 'block', marginBottom: 8 }}>
          欢迎回来，创作者 ⚡
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
          今日已创建 <Text strong style={{ color: '#fff', fontSize: 22 }}>{mockStats.todayCreated}</Text> 个视频，继续保持创作热情！
        </Text>
      </GlassPanel>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        {quickActions.map((action, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <GlassPanel
              variant="card"
              style={{ cursor: 'pointer', padding: 'var(--spacing-lg)' }}
              onClick={() => {}}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: action.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: 20,
                marginBottom: 'var(--spacing-md)',
              }}>
                {action.icon}
              </div>
              <Text strong style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)' }}>{action.label}</Text>
              <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{action.desc}</Text>
            </GlassPanel>
          </Col>
        ))}
      </Row>

      {/* 数据统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        {[
          { title: '素材总量', value: mockStats.materials, icon: <UploadOutlined />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { title: '剧本数量', value: mockStats.scripts, icon: <FileTextOutlined />, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
          { title: '视频产出', value: mockStats.videos, icon: <VideoCameraOutlined />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { title: '今日新增', value: mockStats.todayCreated, icon: <ThunderboltOutlined />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((stat, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <GlassPanel variant="card" style={{ padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{stat.title}</Text>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: stat.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: stat.color, fontSize: 22,
                }}>
                  {stat.icon}
                </div>
              </div>
            </GlassPanel>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24} lg={16}>
          <GlassPanel variant="card">
            <StudioHeader title="创作趋势" icon={<ThunderboltOutlined />} />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 280 }} notMerge />
            </div>
          </GlassPanel>
        </Col>
        <Col xs={24} lg={8}>
          <GlassPanel variant="card">
            <StudioHeader title="品类分布" icon={<FireOutlined />} />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 280 }} notMerge />
            </div>
          </GlassPanel>
        </Col>
      </Row>

      {/* 最近任务 */}
      <GlassPanel variant="card">
        <StudioHeader
          title="最近创作"
          icon={<ClockCircleOutlined />}
          extra={<Button type="link" icon={<RightOutlined />} style={{ color: 'var(--brand-primary)' }}>查看全部</Button>}
        />
        <List
          dataSource={mockRecentTasks}
          renderItem={(task) => {
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
