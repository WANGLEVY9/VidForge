import { useState } from 'react';
import { Input, Badge, Avatar, Space } from 'antd';
import { SearchOutlined, BellOutlined } from '@ant-design/icons';

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div
      className="mobile-top-bar"
      style={{
        height: 'var(--top-bar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'rgba(15,15,19,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        VidForge
      </div>
      <Space size={12}>
        {searchOpen && (
          <Input
            size="small"
            placeholder="搜索..."
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            style={{ width: 180, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', borderColor: 'var(--border-color)' }}
            onBlur={() => setSearchOpen(false)}
            autoFocus
          />
        )}
        <SearchOutlined
          style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }}
          onClick={() => setSearchOpen(!searchOpen)}
        />
        <Badge count={3} size="small">
          <BellOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
        </Badge>
        <Avatar size={28} style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', cursor: 'pointer', fontSize: 12 }}>U</Avatar>
      </Space>
    </div>
  );
}
