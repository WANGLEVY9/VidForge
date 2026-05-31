import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Statistic, Progress, Tooltip, Tag } from 'antd';
import { DollarOutlined, ThunderboltOutlined, FieldTimeOutlined, ApiOutlined, CloudServerOutlined } from '@ant-design/icons';
import { analyticsApi, CostOverview } from '../../services/analytics';

const { Text } = Typography;

interface Props {
  refreshIntervalMs?: number;
}

/**
 * 今日成本观测面板 - V2 端到端 Trace 的可视化窗口
 *
 * 数据来源:GET /api/analytics/cost,聚合自 trace_spans 表
 * - 今日总调用 / Token / 估算成本(美分)
 * - ARK Prompt Cache 命中率
 * - 平均延迟
 *
 * 默认每 30 秒自动刷新。
 */
export const CostOverviewCard: React.FC<Props> = ({ refreshIntervalMs = 30000 }) => {
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

  return (
    <Card
      size="small"
      title={
        <span>
          <DollarOutlined style={{ color: '#10b981', marginRight: 8 }} />
          今日 AI 成本观测
          <Tooltip title="数据来自后端 trace_spans 表,自动统计每次 ARK 调用的 token 与估算成本。包含 prompt cache 命中率,可用于成本优化决策。">
            <Tag color="green" style={{ marginLeft: 8, borderRadius: 20 }}>实时</Tag>
          </Tooltip>
        </span>
      }
      loading={loading && !data}
      style={{ height: '100%' }}
    >
      {data ? (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8}>
            <Statistic
              title={<span><ApiOutlined /> 总调用</span>}
              value={data.totalCalls}
              valueStyle={{ fontSize: 20, color: 'var(--text-primary)' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title={<span><ThunderboltOutlined /> Token 总数</span>}
              value={data.totalTokens}
              valueStyle={{ fontSize: 20, color: 'var(--text-primary)' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title={<span><DollarOutlined /> 估算成本</span>}
              value={costYuan}
              precision={3}
              prefix="¥"
              valueStyle={{ fontSize: 20, color: '#10b981' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title={<span><FieldTimeOutlined /> 平均延迟</span>}
              value={data.avgLatencyMs}
              suffix="ms"
              valueStyle={{ fontSize: 20, color: 'var(--text-primary)' }}
            />
          </Col>
          <Col xs={24} sm={16}>
            <div>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <CloudServerOutlined /> Prompt Cache 命中率
              </Text>
              <div style={{ marginTop: 4 }}>
                <Progress
                  percent={data.cacheHitRate}
                  size="small"
                  strokeColor={{
                    '0%': '#3b82f6',
                    '100%': '#10b981',
                  }}
                  format={(p) => (
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      {p?.toFixed(1)}%
                    </Text>
                  )}
                />
                <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  缓存命中可降低 token 成本 ~70%(火山方舟 Prompt Cache)
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      ) : (
        <Text style={{ color: 'var(--text-tertiary)' }}>暂无数据(还未发起任何 AI 调用)</Text>
      )}
    </Card>
  );
};
