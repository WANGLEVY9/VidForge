import React from 'react';
import { Empty, Skeleton } from 'antd';
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
  loading?: boolean;
  empty?: boolean;
  emptyDescription?: string;
}

export const ChartPanel = React.memo(function ChartPanel({
  title,
  icon,
  option,
  height = 260,
  extra,
  loading = false,
  empty = false,
  emptyDescription = '暂无数据',
}: ChartPanelProps) {
  return (
    <GlassPanel variant="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StudioHeader title={title} icon={icon} extra={extra} />
      <div
        style={{ padding: 'var(--spacing-lg)', flex: 1, minHeight: height, position: 'relative' }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20 }}>
            <Skeleton.Input active block style={{ height: 16 }} />
            <Skeleton.Input active block style={{ height: height - 60 }} />
          </div>
        ) : empty || !option || Object.keys(option).length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
          </div>
        ) : (
          <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} notMerge />
        )}
      </div>
    </GlassPanel>
  );
});
