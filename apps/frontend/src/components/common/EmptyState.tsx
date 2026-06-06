import React from 'react';
import { Typography, Button } from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  loading?: boolean;
}

/**
 * 统一空态组件 — 带图标、标题、描述和可选操作按钮。
 * 用于所有页面的空数据展示，保持视觉一致性。
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无数据',
  description,
  actionText,
  onAction,
  loading = false,
}) => {
  return (
    <div
      className="fade-in"
      style={{
        textAlign: 'center',
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          background: 'var(--bg-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          color: 'var(--text-tertiary)',
          fontSize: 36,
          opacity: 0.6,
        }}
      >
        {icon ?? <InboxOutlined />}
      </div>
      <Text
        style={{
          color: 'var(--text-secondary)',
          fontSize: 16,
          fontWeight: 600,
          display: 'block',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            color: 'var(--text-tertiary)',
            fontSize: 13,
            display: 'block',
            marginBottom: 24,
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Text>
      )}
      {actionText && onAction && (
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={onAction} loading={loading}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export { EmptyState };
