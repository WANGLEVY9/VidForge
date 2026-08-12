import { useState, useEffect } from 'react';
import { Typography, Progress, Skeleton } from 'antd';
import {
  InboxOutlined,
  LoadingOutlined,
  HourglassOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { GlassPanel } from '../studio/GlassPanel';
import { StudioHeader } from '../studio/StudioHeader';
import { analyticsApi } from '../../services/analytics';
import type { QueueStatus as QueueStatusData } from '../../services/analytics';

const { Text } = Typography;

interface QueueMetric {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export function QueueStatus() {
  const [data, setData] = useState<QueueStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = () => {
      analyticsApi.getQueueStatus().then((d: QueueStatusData) => {
        setData(d);
        setLoading(false);
      });
    };
    fetch();
    const timer = setInterval(fetch, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <GlassPanel variant="card">
        <StudioHeader title="生成队列实时状态" icon={<ClockCircleOutlined />} />
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </GlassPanel>
    );
  }

  if (!data) {
    return (
      <GlassPanel variant="card">
        <StudioHeader title="生成队列实时状态" icon={<ClockCircleOutlined />} />
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <Text style={{ color: 'var(--text-tertiary)' }}>加载中...</Text>
        </div>
      </GlassPanel>
    );
  }

  const utilization = data.depth > 0 ? Math.round((data.processing / data.depth) * 100) : 0;

  const metrics: QueueMetric[] = [
    { label: '队列深度', value: String(data.depth), icon: <InboxOutlined />, color: '#6366f1' },
    {
      label: '处理中',
      value: String(data.processing),
      icon: <LoadingOutlined />,
      color: '#10b981',
    },
    { label: '等待中', value: String(data.waiting), icon: <HourglassOutlined />, color: '#f59e0b' },
    {
      label: '平均等待',
      value: `${data.avgWaitTime}s`,
      icon: <ClockCircleOutlined />,
      color: '#3b82f6',
    },
    {
      label: '吞吐量',
      value: `${data.throughput}/分钟`,
      icon: <BarChartOutlined />,
      color: '#a855f7',
    },
  ];

  return (
    <GlassPanel variant="card">
      <StudioHeader title="生成队列实时状态" icon={<ClockCircleOutlined />} />
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>队列利用率</Text>
              <Text style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                {utilization}%
              </Text>
            </div>
            <Progress
              percent={utilization}
              size="small"
              strokeColor={utilization > 80 ? '#ef4444' : utilization > 50 ? '#f59e0b' : '#10b981'}
              trailColor="var(--border-color)"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  background: `${m.color}08`,
                  border: `1px solid ${m.color}15`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: m.color, fontSize: 12 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </div>
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  {m.value}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
