import React from 'react';
import { Typography, Table, Tag } from 'antd';
import { useShell } from '../../../components/layout/shell-context';

const { Text } = Typography;

interface MetricRow {
  metric: string;
  versionA: string;
  versionB: string;
  diff: string;
  winner: 'A' | 'B' | 'TIE' | null;
}

interface CompareMetricsProps {
  metrics: MetricRow[];
}

export const CompareMetrics: React.FC<CompareMetricsProps> = ({ metrics }) => {
  const { isMobile } = useShell();
  const columns = [
    {
      title: '指标', dataIndex: 'metric', key: 'metric',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '版本 A', dataIndex: 'versionA', key: 'versionA',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
    },
    {
      title: '版本 B', dataIndex: 'versionB', key: 'versionB',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
    },
    {
      title: '差异', dataIndex: 'diff', key: 'diff',
      render: (v: string) => {
        const color = v.startsWith('+') ? '#10b981' : v.startsWith('-') ? '#ef4444' : 'var(--text-secondary)';
        return <Text style={{ color }}>{v}</Text>;
      },
    },
    {
      title: '推荐', dataIndex: 'winner', key: 'winner',
      render: (v: 'A' | 'B' | 'TIE' | null) => {
        if (!v || v === 'TIE') return <Tag>持平</Tag>;
        return <Tag color={v === 'A' ? 'blue' : 'green'}>版本 {v}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 'var(--spacing-lg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
      <Text strong style={{ color: 'var(--text-primary)', marginBottom: 12, display: 'block' }}>对比指标</Text>
      <div style={isMobile ? { overflowX: 'auto' } : undefined}>
        <Table
          dataSource={metrics}
          columns={columns}
          pagination={false}
          size="small"
          rowKey="metric"
        />
      </div>
    </div>
  );
};
