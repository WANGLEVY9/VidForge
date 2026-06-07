import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

interface TabConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  href: string;
}

const tabs: TabConfig[] = [
  { key: 'dashboard', label: '工作台', icon: <DashboardOutlined />, href: '/dashboard' },
  { key: 'material', label: '素材库', icon: <UploadOutlined />, href: '/material' },
  { key: 'script', label: '剧本', icon: <FileTextOutlined />, href: '/script' },
  { key: 'creation', label: '创作', icon: <VideoCameraOutlined />, href: '/creation' },
  {
    key: 'ab-compare',
    label: 'AB对比',
    icon: <ExperimentOutlined />,
    href: '/ab-compare',
    badge: 0,
  },
];

interface BottomTabBarProps {
  visible: boolean;
}

export function BottomTabBar({ visible }: BottomTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="glass-tab-bar mobile-tab-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 'var(--tab-bar-height-total)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.href;
        return (
          <div
            key={tab.key}
            className="touch-target touch-feedback"
            onClick={() => navigate(tab.href)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              flex: 1,
              height: 56,
              cursor: 'pointer',
              position: 'relative',
              color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              transition: 'color 0.2s',
            }}
          >
            {tab.badge !== undefined ? (
              <Badge count={tab.badge} size="small" style={{ fontSize: 10 }}>
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
              </Badge>
            ) : (
              <span
                style={{
                  fontSize: 20,
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                }}
              >
                {tab.icon}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            {active && (
              <div
                className="tab-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 20,
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background:
                    'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
