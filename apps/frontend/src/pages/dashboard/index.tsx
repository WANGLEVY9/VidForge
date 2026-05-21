import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Spin, message } from 'antd';
import { FileImageOutlined, FileTextOutlined, VideoCameraOutlined, ClockCircleOutlined, CheckCircleOutlined, RiseOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { formatDuration } from '@/utils';
import {
  getStatistics,
  getVideoTrend,
  getStyleDistribution,
  getConversionEffect,
  getTemplateEffect,
  StatisticsData,
  TrendItem,
  DistributionItem,
  ConversionItem,
  TemplateItem,
} from '@/api/dashboard';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [styleData, setStyleData] = useState<DistributionItem[]>([]);
  const [conversionData, setConversionData] = useState<ConversionItem[]>([]);
  const [templateData, setTemplateData] = useState<TemplateItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stats, trend, style, conversion, template] = await Promise.all([
        getStatistics(),
        getVideoTrend(),
        getStyleDistribution(),
        getConversionEffect(),
        getTemplateEffect(),
      ]);
      setStatistics(stats);
      setTrendData(trend);
      setStyleData(style);
      setConversionData(conversion);
      setTemplateData(template);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 生成趋势图表配置
  const trendChartOption = {
    title: { text: '近7天视频生成趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['生成总数', '成功数'], bottom: 10 },
    xAxis: {
      type: 'category',
      data: trendData.map(item => item.date),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '生成总数',
        type: 'line',
        data: trendData.map(item => item.count),
        smooth: true,
        color: '#1890ff',
      },
      {
        name: '成功数',
        type: 'line',
        data: trendData.map(item => item.successCount),
        smooth: true,
        color: '#52c41a',
      },
    ],
  };

  // 风格分布饼图配置
  const styleChartOption = {
    title: { text: '视频风格分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '风格分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data: styleData,
      },
    ],
  };

  // 转化效果柱状图配置
  const conversionChartOption = {
    title: { text: '产品转化效果对比', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['播放率', '点击率', '转化率'], bottom: 10 },
    xAxis: {
      type: 'category',
      data: conversionData.map(item => item.name),
    },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '播放率',
        type: 'bar',
        data: conversionData.map(item => (item.playRate * 100).toFixed(1)),
        color: '#1890ff',
      },
      {
        name: '点击率',
        type: 'bar',
        data: conversionData.map(item => (item.clickRate * 100).toFixed(1)),
        color: '#52c41a',
      },
      {
        name: '转化率',
        type: 'bar',
        data: conversionData.map(item => (item.conversionRate * 100).toFixed(2)),
        color: '#faad14',
      },
    ],
  };

  // 模板排行榜列定义
  const templateColumns = [
    { title: '模板名称', dataIndex: 'name', key: 'name' },
    { title: '使用次数', dataIndex: 'usageCount', key: 'usageCount', sorter: (a: TemplateItem, b: TemplateItem) => a.usageCount - b.usageCount },
    { 
      title: '平均播放率', 
      dataIndex: 'avgPlayRate', 
      key: 'avgPlayRate', 
      render: (val: number) => `${(val * 100).toFixed(1)}%`,
      sorter: (a: TemplateItem, b: TemplateItem) => a.avgPlayRate - b.avgPlayRate,
    },
    { 
      title: '平均转化率', 
      dataIndex: 'avgConversion', 
      key: 'avgConversion', 
      render: (val: number) => `${(val * 100).toFixed(2)}%`,
      sorter: (a: TemplateItem, b: TemplateItem) => a.avgConversion - b.avgConversion,
    },
    { 
      title: '效果评分', 
      dataIndex: 'score', 
      key: 'score', 
      render: (val: number) => <span style={{ color: val >= 90 ? '#f5222d' : val >= 80 ? '#faad14' : '#52c41a', fontWeight: 'bold' }}>{val}</span>,
      sorter: (a: TemplateItem, b: TemplateItem) => a.score - b.score,
    },
  ];

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {/* 统计卡片 */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="素材总数"
              value={statistics?.totalMaterial || 0}
              prefix={<FileImageOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="剧本总数"
              value={statistics?.totalScript || 0}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="生成视频总数"
              value={statistics?.totalVideo || 0}
              prefix={<VideoCameraOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="总生成时长"
              value={formatDuration(statistics?.totalDuration || 0)}
              prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="平均生成时间"
              value={statistics?.avgGenerationTime || 0}
              suffix="秒"
              prefix={<ClockCircleOutlined style={{ color: '#eb2f96' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="成功率"
              value={(Number(statistics?.successRate || 0) * 100).toFixed(1)}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>

        {/* 趋势图 */}
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={trendChartOption} style={{ height: 400 }} />
          </Card>
        </Col>

        {/* 风格分布饼图 */}
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={styleChartOption} style={{ height: 400 }} />
          </Card>
        </Col>

        {/* 转化效果柱状图 */}
        <Col xs={24}>
          <Card>
            <ReactECharts option={conversionChartOption} style={{ height: 400 }} />
          </Card>
        </Col>

        {/* 模板效果排行 */}
        <Col xs={24}>
          <Card title="模板效果排行" extra={<RiseOutlined style={{ color: '#faad14', fontSize: 20 }} />}>
            <Table
              columns={templateColumns}
              dataSource={templateData}
              rowKey="name"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

export default DashboardPage;
