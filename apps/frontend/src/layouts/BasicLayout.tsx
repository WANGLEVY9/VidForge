import { Avatar, Badge, Tooltip, Tag, Dropdown, Menu } from 'antd';
import {
  RocketOutlined,
  UploadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  BellOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import ThemeToggle from '../components/common/ThemeToggle';
import PrivacySettings from '../components/common/PrivacySettings';
import { ShellProvider } from '../components/layout/shell-context';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TOP_BAR_HEIGHT = 64;

const menuItems = [
  { key: '/dashboard',  icon: <DashboardOutlined />,    label: '工作台' },
  { key: '/material',   icon: <UploadOutlined />,       label: '素材库' },
  { key: '/script',     icon: <FileTextOutlined />,     label: '剧本创作' },
  { key: '/creation',   icon: <VideoCameraOutlined />,  label: '视频创作' },
  { key: '/ab-compare', icon: <ExperimentOutlined />,   label: 'A/B 对比' },
];

const userMenuItems = [
  { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
  { key: 'help',    icon: <QuestionCircleOutlined />, label: '帮助中心' },
  { type: 'divider' as const },
  { key: 'logout',  icon: <LogoutOutlined />, label: '退出登录' },
];

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAppStore();
  const [privacySettingsVisible, setPrivacySettingsVisible] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      console.log('Logout');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'help') {
      navigate('/help');
    }
  };

  const currentMenu = menuItems.find((m) => m.key === location.pathname);

  return (
    <ShellProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* === Sidebar === */}
        <aside
          className="glass-strong"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: sidebarWidth,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            transition: `width ${'var(--duration-normal)'} var(--ease-out)`,
            borderRight: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          {/* Logo */}
          <div
            onClick={() => navigate('/dashboard')}
            style={{
              height: TOP_BAR_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? 0 : '0 20px',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            <RocketOutlined
              style={{
                fontSize: 28,
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            />
            {!collapsed && (
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VidForge
              </span>
            )}
          </div>

          {/* Menu */}
          <Menu
            mode="inline"
            theme="dark"
            inlineCollapsed={collapsed}
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              flex: 1,
              border: 'none',
              padding: '12px 8px',
              background: 'transparent',
              overflow: 'auto',
            }}
          />

          {/* Footer */}
          {!collapsed && (
            <div
              style={{
                margin: '0 12px 16px',
                padding: '12px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <ExperimentOutlined style={{ color: 'var(--brand-primary)' }} />
              <span>AI 驱动电商视频创作</span>
            </div>
          )}
        </aside>

        {/* === Main column === */}
        <div
          style={{
            marginLeft: sidebarWidth,
            transition: `margin-left ${'var(--duration-normal)'} var(--ease-out)`,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top bar */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 99,
              height: TOP_BAR_HEIGHT,
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(15, 15, 19, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
                style={{
                  width: 36,
                  height: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 18,
                  borderRadius: 'var(--radius-md)',
                  transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface-2)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>
                  {currentMenu?.label ?? '工作台'}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                  / VidForge Studio
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ThemeToggle />
              <Tag
                color="success"
                style={{
                  margin: 0,
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                }}
              >
                API 已连接
              </Tag>
              <Tooltip title="通知">
                <Badge count={3} size="small">
                  <BellOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
                </Badge>
              </Tooltip>
              <Tooltip title="设置">
                <SettingOutlined
                  style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => setPrivacySettingsVisible(true)}
                />
              </Tooltip>
              <Dropdown
                menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Avatar
                  size={36}
                  style={{
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                    fontWeight: 600,
                  }}
                >
                  U
                </Avatar>
              </Dropdown>
            </div>
          </header>

          {/* Page content */}
          <main
            data-vidforge-main
            style={{
              flex: 1,
              padding: 'var(--spacing-xl)',
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0, // 防止 flex 子元素被内部内容撑爆
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>

      <PrivacySettings
        visible={privacySettingsVisible}
        onClose={() => setPrivacySettingsVisible(false)}
      />
    </ShellProvider>
  );
}

export default BasicLayout;
