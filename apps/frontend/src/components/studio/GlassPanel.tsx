import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'strong' | 'card';
}

const variantClassMap: Record<'default' | 'strong' | 'card', string> = {
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
  ...rest
}) => {
  const variantClass = variantClassMap[variant] || variantClassMap.default;

  return (
    <div
      className={[variantClass, className].filter(Boolean).join(' ')}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
};

export { GlassPanel };
