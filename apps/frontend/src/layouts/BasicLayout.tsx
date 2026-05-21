import { Layout, Menu } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { menuRoutes } from '@/routes';
import logo from '@/assets/logo.svg';

const { Header, Sider, Content } = Layout;

const BasicLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname;

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {!collapsed && <h2 style={{ margin: 0, color: '#1890ff' }}>VidForge</h2>}
          {collapsed && <h2 style={{ margin: 0, color: '#1890ff' }}>VF</h2>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuRoutes.map((route) => ({
            key: route.path,
            icon: route.icon,
            label: route.name,
          }))}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          {/* 头部可添加用户信息、通知等 */}
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: '#fff', borderRadius: 6 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default BasicLayout;
