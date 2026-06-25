import { useState, useEffect } from 'react';
import { Typography, Progress, Skeleton, Row, Col, Space } from 'antd';
import {
  DollarOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  ApiOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { GlassPanel } from '../studio/GlassPanel';
import { StudioHeader } from '../studio/StudioHeader';
import { analyticsApi } from '../../services/analytics';
import type { CostOverview } from '../../services/analytics';

const { Text } = Typography;

interface Props {
  refreshIntervalMs?: number;
}

interface CostMetric {
  label: React.ReactNode;
  value: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

/**
 * 今日成本观测面板 - V2 端到端 Trace 的可视化窗口
 *
 * 数据来源: GET /api/analytics/cost, 聚合自 trace_spans 表
 * - 今日总调用 / Token / 估算成本(美分)
 * - ARK Prompt Cache 命中率
 * - 平均延迟
 *
 * 默认每 30 秒自动刷新。
 */
export function CostOverviewCard({ refreshIntervalMs = 30000 }: Props) {
  const [data, setData] = useState<CostOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const d = await analyticsApi.getCostOverview();
      setData(d);
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, refreshIntervalMs);
    return () => clearInterval(t);
  }, [refreshIntervalMs]);

  const costYuan = data ? (data.totalCostCents / 100) * 7 : 0; // 美分→人民币粗估

  const metrics: CostMetric[] = [
    {
      label: (
        <span>
          <ApiOutlined /> 总调用
        </span>
      ),
      value: String(data?.totalCalls ?? 0),
      unit: '次',
      color: '#6366f1',
      icon: <ApiOutlined />,
    },
    {
      label: (
        <span>
          <ThunderboltOutlined /> Token 总数
        </span>
      ),
      value: String(data?.totalTokens ?? 0),
      unit: '',
      color: '#a855f7',
      icon: <ThunderboltOutlined />,
    },
    {
      label: (
        <span>
          <DollarOutlined /> 估算成本
        </span>
      ),
      value: costYuan.toFixed(3),
      unit: '¥',
      color: '#10b981',
      icon: <DollarOutlined />,
    },
    {
      label: (
        <span>
          <FieldTimeOutlined /> 平均延迟
        </span>
      ),
      value: String(data?.avgLatencyMs ?? 0),
      unit: 'ms',
      color: '#f59e0b',
      icon: <FieldTimeOutlined />,
    },
  ];

  return (
    <GlassPanel variant="card" style={{ height: '100%' }}>
      <StudioHeader
        title="今日 AI 成本观测"
        icon={<CloudServerOutlined />}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <Text style={{ fontSize: 12, color: '#10b981' }}>实时</Text>
          </div>
        }
      />
      <div style={{ padding: 'var(--spacing-lg)' }}>
        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : data ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Row gutter={[16, 16]}>
              {metrics.map((m, i) => (
                <Col xs={12} sm={6} key={i}>
                  <div
                    style={{
                      padding: 'var(--spacing-md)',
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
                        marginBottom: 4,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ color: m.color }}>{m.icon}</span>
                      <span>{m.label}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.2,
                      }}
                    >
                      {m.unit && m.unit !== '¥' ? (
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginRight: 2 }}>
                          {m.unit}
                        </span>
                      ) : null}
                      {m.unit === '¥' ? (
                        <span style={{ color: m.color, marginRight: 2 }}>{m.unit}</span>
                      ) : null}
                      {m.value}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <CloudServerOutlined /> Prompt Cache 命中率
                </Text>
                <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                  {data.cacheHitRate.toFixed(1)}%
                </Text>
              </div>
              <Progress
                percent={data.cacheHitRate}
                size="small"
                strokeColor={{
                  '0%': '#3b82f6',
                  '100%': '#10b981',
                }}
                trailColor="var(--border-color)"
                format={(p) => (
                  <Text strong style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {p?.toFixed(0)}%
                  </Text>
                )}
              />
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 4 }}>
                缓存命中可降低 token 成本 ~70%（火山方舟 Prompt Cache）
              </Text>
            </div>
          </Space>
        ) : (
          <Text style={{ color: 'var(--text-tertiary)' }}>暂无数据（还未发起任何 AI 调用）</Text>
        )}
      </div>
    </GlassPanel>
  );
}
