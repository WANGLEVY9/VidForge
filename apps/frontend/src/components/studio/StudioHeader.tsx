import React from 'react';
import { Typography, Space } from 'antd';

const { Text } = Typography;

interface StudioHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--spacing-lg) 0',
};

const leftSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
};

const iconStyle: React.CSSProperties = {
  fontSize: 24,
  color: 'var(--brand-primary)',
  display: 'flex',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-tertiary)',
  margin: 0,
};

const StudioHeader: React.FC<StudioHeaderProps> = ({
  title,
  subtitle,
  icon,
  extra,
  className = '',
}) => {
  return (
    <div className={className} style={headerStyle}>
      <div style={leftSectionStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <div>
          <Text style={titleStyle}>{title}</Text>
          {subtitle && (
            <div>
              <Text style={subtitleStyle}>{subtitle}</Text>
            </div>
          )}
        </div>
      </div>
      {extra && (
        <Space size="small">
          {extra}
        </Space>
      )}
    </div>
  );
};

export { StudioHeader };
