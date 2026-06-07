import React from 'react';
import { Card, Tag, Typography, Progress, Space, Empty, Alert } from 'antd';
import { CheckCircleOutlined, WarningOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { ComplianceReport } from '../../services/script';

const { Text } = Typography;

interface Props {
  report?: ComplianceReport;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
};

const CATEGORY_LABEL: Record<string, string> = {
  extreme: '广告法极限词',
  medical: '医疗保健禁用',
  hype: '诱导/夸大',
  platform: '平台规则',
  custom: '商家自定义',
};

/**
 * 合规审核结果卡片 - 让 V2 的合规护城河可见
 *
 * 显示:
 *   - 综合分(0-100)与是否通过
 *   - 每条命中:违禁词 / 类别 / 严重度 / 修改建议
 *   - 当 LLM 复核被触发时,展示反馈
 */
export const ComplianceCard: React.FC<Props> = ({ report }) => {
  if (!report) return null;

  const { passed, score, hits, llmReviewed, llmFeedback } = report;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <Card
      size="small"
      style={{
        marginBottom: 'var(--spacing-md)',
        border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        background: passed
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
      }}
      styles={{ body: { padding: 'var(--spacing-md) var(--spacing-lg)' } }}
    >
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <SafetyCertificateOutlined style={{ color, fontSize: 18 }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>
            合规审核
          </Text>
          {passed ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              已通过
            </Tag>
          ) : (
            <Tag color="error" icon={<WarningOutlined />}>
              需修改
            </Tag>
          )}
          {llmReviewed && <Tag color="purple">LLM 二次复核</Tag>}
        </Space>
        <Space>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>合规分</Text>
          <Text strong style={{ color, fontSize: 16 }}>
            {score}
          </Text>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/ 100</Text>
        </Space>
      </Space>

      <Progress
        percent={score}
        showInfo={false}
        strokeColor={color}
        size="small"
        style={{ marginBottom: 12 }}
      />

      {hits.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text style={{ color: 'var(--text-tertiary)' }}>未发现违规风险</Text>}
        />
      ) : (
        <div>
          <Text
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 12,
              display: 'block',
              marginBottom: 6,
            }}
          >
            命中 {hits.length} 项,严重 {hits.filter((h) => h.severity === 'high').length} / 中等{' '}
            {hits.filter((h) => h.severity === 'medium').length}:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hits.map((hit, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 8,
                  background: 'var(--bg-surface-2)',
                  borderRadius: 6,
                  borderLeft: `3px solid ${SEVERITY_COLOR[hit.severity]}`,
                }}
              >
                <Tag
                  color={SEVERITY_COLOR[hit.severity]}
                  style={{ minWidth: 48, textAlign: 'center', margin: 0 }}
                >
                  {SEVERITY_LABEL[hit.severity]}
                </Tag>
                <div style={{ flex: 1 }}>
                  <Space size={6}>
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      "{hit.word}"
                    </Text>
                    <Tag style={{ fontSize: 11, margin: 0 }}>{CATEGORY_LABEL[hit.category]}</Tag>
                  </Space>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {hit.reason}
                    {hit.suggestion && (
                      <>
                        {' '}
                        → 建议替换为 <Text mark>{hit.suggestion}</Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {llmFeedback && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12, fontSize: 12 }}
          message="LLM 复核反馈"
          description={llmFeedback}
        />
      )}
    </Card>
  );
};
