import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuRoutes } from '@/routes';

const { Header, Sider, Content } = Layout;

interface BasicLayoutProps {
  children: React.ReactNode;
}

function BasicLayout({ children }: BasicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <h1 style={{ margin: 0 }}>VidForge</h1>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuRoutes.map((route) => ({
              key: route.path,
              icon: route.icon,
              label: route.name,
              onClick: () => navigate(route.path),
            }))}
          />
        </Sider>
        <Content style={{ padding: 24, margin: 0, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default BasicLayout;
