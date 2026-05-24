import { useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Typography, List, Button, Space, Badge, Tooltip, Progress } from 'antd';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  FireOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { theme } from '../../theme/tokens';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const { Title, Text } = Typography;

// 模拟数据
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
  { icon: <RocketOutlined />, label: '快速创作', desc: '一键生成带货视频', color: theme.colors.gradientPrimary },
  { icon: <BulbOutlined />, label: '智能剧本', desc: 'AI 生成营销文案', color: theme.colors.gradientSecondary },
  { icon: <UploadOutlined />, label: '批量上传', desc: '素材批量管理', color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { icon: <FireOutlined />, label: '热门模板', desc: '爆款视频模板库', color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
];

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  processing: { color: 'processing', text: '生成中', icon: <SyncOutlined spin /> },
  failed: { color: 'error', text: '失败', icon: <ClockCircleOutlined /> },
  pending: { color: 'default', text: '排队中', icon: <ClockCircleOutlined /> },
};

function DashboardPage() {
  const trendOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: '#fff', borderColor: theme.colors.borderColor, textStyle: { color: theme.colors.textPrimary } },
    legend: { data: ['视频产出', '剧本生成'], right: 0, top: 0, textStyle: { color: theme.colors.textSecondary } },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: { type: 'category' as const, data: mockTrend.dates, axisLine: { lineStyle: { color: theme.colors.borderColor } }, axisLabel: { color: theme.colors.textTertiary } },
    yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: theme.colors.borderColorSecondary } }, axisLabel: { color: theme.colors.textTertiary } },
    series: [
      { name: '视频产出', type: 'line', data: mockTrend.videos, smooth: true, lineStyle: { width: 3, color: theme.colors.primary }, itemStyle: { color: theme.colors.primary }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }]) } },
      { name: '剧本生成', type: 'line', data: mockTrend.scripts, smooth: true, lineStyle: { width: 3, color: theme.colors.secondary }, itemStyle: { color: theme.colors.secondary }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(236,72,153,0.15)' }, { offset: 1, color: 'rgba(236,72,153,0)' }]) } },
    ],
  };

  const pieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: '#fff', borderColor: theme.colors.borderColor },
    legend: { orient: 'vertical' as const, right: 0, top: 'center', textStyle: { color: theme.colors.textSecondary } },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: 15, name: '服饰鞋包', itemStyle: { color: theme.colors.primary } },
        { value: 10, name: '美妆护肤', itemStyle: { color: theme.colors.secondary } },
        { value: 5, name: '数码3C', itemStyle: { color: theme.colors.success } },
        { value: 3, name: '食品饮料', itemStyle: { color: theme.colors.warning } },
        { value: 1, name: '家居生活', itemStyle: { color: theme.colors.info } },
      ],
    }],
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 欢迎区 */}
      <div style={{
        background: theme.colors.gradientPrimary,
        borderRadius: theme.borderRadius.xl,
        padding: `${theme.spacing.xxl}px ${theme.spacing.xxxl}px`,
        marginBottom: theme.spacing.xl,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
          欢迎回来，创作者 👋
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: theme.fonts.fontSize.lg }}>
          今日已创建 <Text strong style={{ color: '#fff', fontSize: 20 }}>{mockStats.todayCreated}</Text> 个视频，继续保持创作热情！
        </Text>
      </div>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginBottom: theme.spacing.xl }}>
        {quickActions.map((action, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card
              hoverable
              className="hover-lift"
              style={{ borderRadius: theme.borderRadius.lg, border: 'none', cursor: 'pointer' }}
              styles={{ body: { padding: theme.spacing.lg } }}
            >
              <div style={{ width: 44, height: 44, borderRadius: theme.borderRadius.md, background: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, marginBottom: theme.spacing.md }}>
                {action.icon}
              </div>
              <Text strong style={{ display: 'block', fontSize: theme.fonts.fontSize.lg, color: theme.colors.textPrimary }}>{action.label}</Text>
              <Text type="secondary" style={{ fontSize: theme.fonts.fontSize.sm }}>{action.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 数据统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: theme.spacing.xl }}>
        {[
          { title: '素材总量', value: mockStats.materials, icon: <UploadOutlined />, color: theme.colors.primary, bg: theme.colors.primaryBg },
          { title: '剧本数量', value: mockStats.scripts, icon: <FileTextOutlined />, color: theme.colors.secondary, bg: '#fdf2f8' },
          { title: '视频产出', value: mockStats.videos, icon: <VideoCameraOutlined />, color: theme.colors.success, bg: theme.colors.successBg },
          { title: '今日新增', value: mockStats.todayCreated, icon: <ThunderboltOutlined />, color: theme.colors.warning, bg: theme.colors.warningBg, suffix: <ArrowUpOutlined style={{ color: theme.colors.success, fontSize: 12 }} /> },
        ].map((stat, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card className="hover-lift" style={{ borderRadius: theme.borderRadius.lg, border: 'none' }} styles={{ body: { padding: `${theme.spacing.xl}px ${theme.spacing.lg}px` } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: theme.fonts.fontSize.sm }}>{stat.title}</Text>
                  <Statistic value={stat.value} valueStyle={{ color: theme.colors.textPrimary, fontSize: 28, fontWeight: 700, marginTop: 4 }} suffix={stat.suffix} />
                </div>
                <div style={{ width: 48, height: 48, borderRadius: theme.borderRadius.lg, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 22 }}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: theme.spacing.xl }}>
        <Col xs={24} lg={16}>
          <Card title={<Space><ThunderboltOutlined style={{ color: theme.colors.primary }} />创作趋势</Space>} style={{ borderRadius: theme.borderRadius.lg, border: 'none' }} styles={{ body: { padding: theme.spacing.lg } }}>
            <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<Space><FireOutlined style={{ color: theme.colors.secondary }} />品类分布</Space>} style={{ borderRadius: theme.borderRadius.lg, border: 'none' }} styles={{ body: { padding: theme.spacing.lg } }}>
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
      </Row>

      {/* 最近任务 */}
      <Card
        title={<Space><ClockCircleOutlined style={{ color: theme.colors.primary }} />最近创作</Space>}
        extra={<Button type="link" icon={<PlusOutlined />}>查看全部</Button>}
        style={{ borderRadius: theme.borderRadius.lg, border: 'none' }}
        styles={{ body: { padding: 0 } }}
      >
        <List
          dataSource={mockRecentTasks}
          renderItem={(task) => {
            const st = statusMap[task.status];
            return (
              <List.Item
                style={{ padding: `${theme.spacing.lg}px ${theme.spacing.xl}px`, borderBottom: `1px solid ${theme.colors.borderColorSecondary}` }}
                actions={[
                  task.status === 'completed' && (
                    <Tooltip title="预览视频" key="preview">
                      <Button type="text" icon={<PlayCircleOutlined />} style={{ color: theme.colors.primary }} />
                    </Tooltip>
                  ),
                  <Tooltip title="重新生成" key="retry">
                    <Button type="text" icon={<SyncOutlined />} />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge status={st.color as any} />
                  }
                  title={
                    <Space>
                      <Text strong style={{ color: theme.colors.textPrimary }}>{task.name}</Text>
                      <Tag color={st.color} icon={st.icon} style={{ borderRadius: 20, fontSize: 12 }}>{st.text}</Tag>
                    </Space>
                  }
                  description={
                    <Space size={16}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{task.createdAt}</Text>
                      {task.status === 'completed' && <Text type="secondary" style={{ fontSize: 12 }}>时长 {task.duration}</Text>}
                      {task.status === 'processing' && <Progress percent={task.progress} size="small" style={{ width: 120 }} strokeColor={theme.colors.primary} />}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}

export default DashboardPage;
