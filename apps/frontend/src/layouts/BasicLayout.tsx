import { Avatar, Tooltip, Dropdown, Menu, Modal } from 'antd';
import {
  RocketOutlined,
  AppstoreOutlined,
  UserOutlined,
  ExperimentOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSpaceStore } from '../store/useSpaceStore';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from '../components/common/ThemeToggle';
import PrivacySettings from '../components/common/PrivacySettings';
import NotificationCenter from '../components/layout/NotificationCenter';
import ApiStatusCenter from '../components/layout/ApiStatusCenter';
import { ShellProvider } from '../components/layout/shell-context';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TOP_BAR_HEIGHT = 64;

const menuItems = [
  { key: '/workspace', icon: <AppstoreOutlined />, label: '商品空间' },
  { key: '/profile', icon: <UserOutlined />, label: '个人中心' },
];

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearSpaces = useSpaceStore((s) => s.clear);
  const { isDark } = useTheme();
  const [privacySettingsVisible, setPrivacySettingsVisible] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        clearSession();
        clearSpaces();
        navigate('/auth/login', { replace: true });
      },
    });
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'help') {
      navigate('/help');
    }
  };

  const userMenuItems = [
    {
      key: 'header',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.username ?? '未登录'}</div>
          {user?.email && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{user.email}</div>
          )}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'help', icon: <QuestionCircleOutlined />, label: '帮助中心' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  // 当前页面显示在面包屑里的标题
  const breadcrumbLabel = (() => {
    if (location.pathname.startsWith('/profile')) return '个人中心';
    if (location.pathname.startsWith('/workspace')) return '商品空间';
    return 'Studio';
  })();

  // 侧栏菜单的高亮 key（按前缀匹配）
  const selectedKey =
    menuItems.find((m) => location.pathname.startsWith(m.key))?.key ?? '/workspace';

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
            transition: `width var(--duration-normal) var(--ease-out)`,
            borderRight: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          {/* Logo */}
          <div
            onClick={() => navigate('/workspace')}
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
                background:
                  'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
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
            theme={isDark ? 'dark' : 'light'}
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
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
            transition: `margin-left var(--duration-normal) var(--ease-out)`,
            minHeight: '100vh',
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
              background: 'var(--header-bg)',
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
                  transition:
                    'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
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
                  {breadcrumbLabel}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                  / VidForge Studio
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ThemeToggle />
              <ApiStatusCenter />
              <NotificationCenter />
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
                    background:
                      'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                    fontWeight: 600,
                  }}
                >
                  {(user?.username ?? 'U').charAt(0).toUpperCase()}
                </Avatar>
              </Dropdown>
            </div>
          </header>

          {/* Page content */}
          <main
            data-vidforge-main
            style={{
              padding: 'var(--spacing-xl)',
              boxSizing: 'border-box',
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
