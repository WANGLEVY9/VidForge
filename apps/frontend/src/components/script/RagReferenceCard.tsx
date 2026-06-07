import React from 'react';
import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import { BulbOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { RagReference } from '../../services/script';

const { Text, Paragraph } = Typography;

interface Props {
  references?: RagReference[];
  /** 模型来源,fallback 时不展示 */
  source?: 'ark' | 'fallback';
}

const HOOK_COLOR: Record<string, string> = {
  疑问: '#3b82f6',
  数字: '#a855f7',
  对比: '#ec4899',
  痛点: '#f59e0b',
  反差: '#06b6d4',
  揭秘: '#10b981',
};

/**
 * RAG 参考卡片 - 让"知识库注入"在前端可见
 *
 * 触发场景:剧本生成完成后,如果 ragReferences 存在,在剧本结果旁边
 * 展示"本次生成参考了以下爆款"的卡片,带 hookType 与历史效果。
 */
export const RagReferenceCard: React.FC<Props> = ({ references, source }) => {
  if (!references || references.length === 0 || source === 'fallback') return null;

  return (
    <Card
      size="small"
      style={{
        marginBottom: 'var(--spacing-md)',
        background:
          'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(99, 102, 241, 0.06) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
      }}
      styles={{ body: { padding: 'var(--spacing-md) var(--spacing-lg)' } }}
    >
      <Space size={8} style={{ marginBottom: 8 }}>
        <BulbOutlined style={{ color: '#a855f7' }} />
        <Text strong style={{ color: 'var(--text-primary)' }}>
          本次生成参考了以下爆款脚本
        </Text>
        <Tooltip title="VidForge 内置 25+ 条人工标注电商爆款,按品类×风格 Top-K 检索作为 few-shot 注入 prompt,提升生成质量">
          <Tag color="purple" style={{ borderRadius: 20 }}>
            RAG · {references.length} 条
          </Tag>
        </Tooltip>
      </Space>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {references.map((ref) => (
          <div
            key={ref.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '4px 0',
            }}
          >
            <Tag
              color={HOOK_COLOR[ref.hookType] ?? 'blue'}
              style={{ minWidth: 60, textAlign: 'center', borderRadius: 4 }}
            >
              {ref.hookType}
            </Tag>
            <Text code style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {ref.id}
            </Text>
            <Paragraph
              ellipsis
              style={{ margin: 0, flex: 1, color: 'var(--text-secondary)', fontSize: 12 }}
            >
              <ThunderboltOutlined style={{ color: '#10b981', marginRight: 4 }} />
              {ref.performance}
            </Paragraph>
          </div>
        ))}
      </div>
    </Card>
  );
};
