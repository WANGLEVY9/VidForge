import { memo } from 'react';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { GlassPanel } from '../studio/GlassPanel';
import { StudioHeader } from '../studio/StudioHeader';

interface ChartPanelProps {
  title: string;
  icon: React.ReactNode;
  option: any;
  height?: number;
  extra?: React.ReactNode;
}

export const ChartPanel = memo(function ChartPanel({
  title,
  icon,
  option,
  height = 260,
  extra,
}: ChartPanelProps) {
  return (
    <GlassPanel variant="card">
      <StudioHeader title={title} icon={icon} extra={extra} />
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <ReactEChartsCore echarts={echarts} option={option} style={{ height }} notMerge />
      </div>
    </GlassPanel>
  );
});
