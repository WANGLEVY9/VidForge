import { Menu, Avatar, Badge, Tooltip, Tag, Dropdown } from 'antd';
import {
  RocketOutlined,
  UploadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  DashboardOutlined,
  BellOutlined,
  SettingOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import ThemeToggle from '../components/common/ThemeToggle';
import { ShellProvider } from '../components/layout/shell-context';
import { MobileShell } from '../components/layout/MobileShell';

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '工作台',
  },
  {
    key: '/material',
    icon: <UploadOutlined />,
    label: '素材库',
  },
  {
    key: '/script',
    icon: <FileTextOutlined />,
    label: '剧本创作',
  },
  {
    key: '/creation',
    icon: <VideoCameraOutlined />,
    label: '视频创作',
  },
];

const userMenuItems = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: '个人中心',
  },
  {
    key: 'help',
    icon: <QuestionCircleOutlined />,
    label: '帮助中心',
  },
  { type: 'divider' as const },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: '退出登录',
  },
];

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAppStore();

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      console.log('Logout');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'help') {
      navigate('/help');
    }
  };

  const sidebar = (
    <div
      className="glass-strong desktop-sidebar"
      style={{
        width: collapsed ? 80 : 240,
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width var(--duration-normal) var(--ease-out)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid var(--border-color)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => navigate('/dashboard')}
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
              background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            VidForge
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{
          border: 'none',
          padding: '12px 8px',
          flex: 1,
          overflow: 'auto',
          background: 'transparent',
        }}
        theme="dark"
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />

      {/* 底部 AI 标签 */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 16px',
            margin: '0 12px 16px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExperimentOutlined style={{ color: 'var(--brand-primary)' }} />
            <span>AI 驱动电商视频创作</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ShellProvider>
      <MobileShell sidebar={sidebar}>
        <div
          className="desktop-top-bar"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(26,26,35,0.6)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 折叠按钮 */}
            <div
              onClick={toggleSidebar}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            {/* 面包屑 */}
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {menuItems.find((m) => m.key === location.pathname)?.label || '工作台'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 主题切换 */}
            <ThemeToggle />

            {/* API 状态 */}
            <Tag color="success" style={{ borderRadius: 'var(--radius-md)', margin: 0 }}>
              API 已连接
            </Tag>

            {/* 通知 */}
            <Tooltip title="通知">
              <Badge count={3} size="small">
                <BellOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
              </Badge>
            </Tooltip>

            {/* 设置 */}
            <Tooltip title="设置">
              <SettingOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
            </Tooltip>

            {/* 用户头像下拉 */}
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Avatar
                size={36}
                style={{
                  background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
              >
                U
              </Avatar>
            </Dropdown>
          </div>
        </div>
        <div
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
            background: 'var(--bg-primary)',
          }}
        >
          <Outlet />
        </div>
      </MobileShell>
    </ShellProvider>
  );
}

export default BasicLayout;
