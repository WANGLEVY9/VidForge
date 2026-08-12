import React from 'react';
import { Typography, Skeleton } from 'antd';
import { GlassPanel } from '../studio/GlassPanel';

const { Text } = Typography;

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  change?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = React.memo(function MetricCard({
  title,
  value,
  change,
  icon,
  color,
  loading = false,
}) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-') && !change?.startsWith('+-');

  return (
    <GlassPanel
      variant="card"
      className="hover-lift"
      style={{
        padding: 'var(--spacing-lg)',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* 微弱的色相光晕 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 80% at 100% 0%, ${color}22 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          height: '100%',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block' }}>
            {title}
          </Text>
          {loading ? (
            <Skeleton.Button active size="small" style={{ width: 80, marginTop: 4, height: 28 }} />
          ) : (
            <div
              className="count-up"
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: 4,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                wordBreak: 'keep-all',
              }}
            >
              {value ?? '—'}
            </div>
          )}
          {loading ? (
            <Skeleton.Button active size="small" style={{ width: 60, marginTop: 4, height: 16 }} />
          ) : change ? (
            <Text
              style={{
                fontSize: 12,
                color: isPositive ? '#10b981' : isNegative ? '#ef4444' : 'var(--text-tertiary)',
                display: 'block',
                marginTop: 4,
              }}
            >
              {change} 较上月
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                display: 'block',
                marginTop: 4,
              }}
            >
              —
            </Text>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: `${color}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </GlassPanel>
  );
});
