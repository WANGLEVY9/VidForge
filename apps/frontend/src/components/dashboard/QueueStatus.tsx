import React, { useState, useEffect } from 'react';
import { Typography, Progress, Space } from 'antd';
import { analyticsApi, QueueStatus as QueueStatusData } from '../../services/analytics';

const { Text } = Typography;

export const QueueStatus: React.FC = () => {
  const [data, setData] = useState<QueueStatusData | null>(null);

  useEffect(() => {
    const fetch = () => analyticsApi.getQueueStatus().then(setData);
    fetch();
    const timer = setInterval(fetch, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return <Text style={{ color: 'var(--text-tertiary)' }}>加载中...</Text>;
  }

  const utilization = data.depth > 0 ? Math.round((data.processing / data.depth) * 100) : 0;

  return (
    <div style={{ padding: 'var(--spacing-md)' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>队列利用率</Text>
          <Progress
            percent={utilization}
            size="small"
            strokeColor="var(--brand-primary)"
            trailColor="var(--border-color)"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>队列深度</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.depth}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>处理中</Text>
          <Text style={{ color: '#10b981', fontSize: 12 }}>{data.processing}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>等待中</Text>
          <Text style={{ color: '#f59e0b', fontSize: 12 }}>{data.waiting}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>平均等待</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.avgWaitTime}s</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>吞吐量</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.throughput}/分钟</Text>
        </div>
      </Space>
    </div>
  );
};
