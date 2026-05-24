import { Layout, Menu, Avatar, Badge, Tooltip, Tag } from 'antd';
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
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Sider, Content, Header } = Layout;

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

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
        theme="light"
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <RocketOutlined
            style={{
              fontSize: 28,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
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
            height: 'calc(100% - 64px)',
            overflow: 'auto',
          }}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />

        {/* 底部信息 */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
              borderRadius: 12,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExperimentOutlined style={{ color: '#6366f1' }} />
              <span>AI 驱动电商视频创作</span>
            </div>
          </div>
        )}
      </Sider>

      {/* 主内容区 */}
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 240,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* 顶部导航 */}
        <Header
          style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          height: 64,
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 折叠按钮 */}
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: '#64748b',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
              >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            {/* 面包屑 */}
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {menuItems.find((m) => m.key === location.pathname)?.label || '工作台'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* API 状态 */}
            <Tag color="success" style={{ borderRadius: 12, margin: 0 }}>
              API 已连接
            </Tag>

            {/* 通知 */}
            <Tooltip title="通知">
              <Badge count={3} size="small">
                <BellOutlined style={{ fontSize: 18, color: '#64748b', cursor: 'pointer' }} />
              </Badge>
            </Tooltip>

            {/* 设置 */}
            <Tooltip title="设置">
              <SettingOutlined style={{ fontSize: 18, color: '#64748b', cursor: 'pointer' }} />
            </Tooltip>

            {/* 用户头像 */}
            <Avatar
              size={36}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              U
            </Avatar>
          </div>
        </Header>

        {/* 页面内容 */}
        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
            background: '#f8fafc',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default BasicLayout;
