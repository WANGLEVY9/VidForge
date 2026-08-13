import { Avatar, Dropdown, Menu, Modal, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSpaceStore } from '../store/useSpaceStore';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from '../components/common/ThemeToggle';
import PrivacySettings from '../components/common/PrivacySettings';
import NotificationCenter from '../components/layout/NotificationCenter';
import ApiStatusCenter from '../components/layout/ApiStatusCenter';
import { ShellProvider } from '../components/layout/shell-context';
import './workspace-shell.css';

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
    if (key === 'logout') handleLogout();
    if (key === 'profile') navigate('/profile');
    if (key === 'help') navigate('/help');
  };

  const userMenuItems = [
    {
      key: 'header',
      label: (
        <div className="workspace-user-menu-header">
          <div className="workspace-user-menu-name">{user?.username ?? '未登录'}</div>
          {user?.email && <div className="workspace-user-menu-email">{user.email}</div>}
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

  const breadcrumbLabel = location.pathname.startsWith('/profile')
    ? '个人中心'
    : location.pathname.startsWith('/workspace')
      ? '商品空间'
      : 'Studio';
  const selectedKey =
    menuItems.find((m) => location.pathname.startsWith(m.key))?.key ?? '/workspace';

  return (
    <ShellProvider>
      <div className={`vidforge-shell ${collapsed ? 'is-collapsed' : ''}`}>
        <aside className="vidforge-sidebar" aria-label="主导航">
          <button
            type="button"
            className="vidforge-sidebar-brand"
            onClick={() => navigate('/workspace')}
            aria-label="返回 VidForge 工作台"
          >
            <span className="vidforge-brand-mark" aria-hidden="true">
              VF
            </span>
            {!collapsed && <span className="vidforge-brand-name">VidForge</span>}
          </button>

          <Menu
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className="vidforge-sidebar-menu"
          />

          {!collapsed && (
            <div className="vidforge-sidebar-note">
              <ExperimentOutlined />
              <span>AI 驱动电商视频创作</span>
            </div>
          )}
        </aside>

        <div className="vidforge-shell-main">
          <header className="vidforge-topbar">
            <div className="vidforge-topbar-leading">
              <button
                type="button"
                className="vidforge-icon-button"
                onClick={toggleSidebar}
                aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div className="vidforge-breadcrumb" aria-label="当前位置">
                <strong>{breadcrumbLabel}</strong>
                <span>/ VidForge Studio</span>
              </div>
            </div>

            <div className="vidforge-topbar-actions">
              <ThemeToggle />
              <ApiStatusCenter />
              <NotificationCenter />
              <Tooltip title="隐私与设置">
                <button
                  type="button"
                  className="vidforge-icon-button"
                  onClick={() => setPrivacySettingsVisible(true)}
                  aria-label="打开隐私与设置"
                >
                  <SettingOutlined />
                </button>
              </Tooltip>
              <Dropdown
                menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                placement="bottomRight"
                trigger={['click']}
              >
                <button type="button" className="vidforge-avatar-button" aria-label="打开用户菜单">
                  <Avatar>{(user?.username ?? 'U').charAt(0).toUpperCase()}</Avatar>
                </button>
              </Dropdown>
            </div>
          </header>

          <main data-vidforge-main className="vidforge-page-content">
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
