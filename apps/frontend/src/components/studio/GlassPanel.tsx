import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'strong' | 'card';
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const variantClassMap: Record<string, string> = {
  default: 'glass',
  strong: 'glass-strong',
  card: 'glass-card',
};

const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  style,
  variant = 'default',
  onClick,
}) => {
  const variantClass = variantClassMap[variant] || variantClassMap.default;

  return (
    <div
      className={`${variantClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
