import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Tabs, Select, Spin, Typography, Space, Tag, Button } from 'antd';
import {
  PictureOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useSpaceStore } from '../store/useSpaceStore';

const { Text } = Typography;

const WORKSPACE_TABS = [
  { key: 'material', label: '素材', icon: <PictureOutlined /> },
  { key: 'script', label: '剧本', icon: <FileTextOutlined /> },
  { key: 'video', label: '视频', icon: <VideoCameraOutlined /> },
  { key: 'data', label: '数据', icon: <DashboardOutlined /> },
  { key: 'ab', label: 'A/B 对比', icon: <ExperimentOutlined /> },
];

export default function WorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const spaces = useSpaceStore((s) => s.spaces);
  const loaded = useSpaceStore((s) => s.loaded);
  const load = useSpaceStore((s) => s.load);
  const setActive = useSpaceStore((s) => s.setActive);

  // 加载空间列表
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  // 同步当前 spaceId 到 store
  useEffect(() => {
    if (spaceId) setActive(spaceId);
  }, [spaceId, setActive]);

  // 解析当前 tab key
  const segs = location.pathname.split('/').filter(Boolean);
  // /workspace/:spaceId/<tabKey>
  const currentTabKey = segs[2] ?? 'material';

  const handleTabChange = (key: string) => {
    if (!spaceId) return;
    navigate(`/workspace/${spaceId}/${key}`);
  };

  const handleSwitchSpace = (id: string) => {
    setActive(id);
    navigate(`/workspace/${id}/${currentTabKey}`);
  };

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const currentSpace = spaces.find((s) => s.id === spaceId);

  // 空间不存在 → 引导回工作台
  if (spaceId && !currentSpace) {
    return (
      <div className="page-enter" style={{ textAlign: 'center', padding: 60 }}>
        <Text
          style={{
            color: 'var(--text-tertiary)',
            fontSize: 14,
            display: 'block',
            marginBottom: 16,
          }}
        >
          找不到该商品空间，可能已被归档或无权访问
        </Text>
        <Button type="primary" onClick={() => navigate('/workspace')}>
          返回空间列表
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Workspace 顶部：空间切换 + 标题 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space size="middle" align="center">
          <Select
            value={spaceId}
            onChange={handleSwitchSpace}
            style={{ minWidth: 240 }}
            size="large"
            options={spaces.map((s) => ({
              value: s.id,
              label: (
                <Space>
                  <span>{s.name}</span>
                  {s.isDefault && (
                    <Tag color="cyan" style={{ margin: 0 }}>
                      默认
                    </Tag>
                  )}
                </Space>
              ),
            }))}
          />
          {currentSpace?.productName && (
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              主推：{currentSpace.productName}
            </Text>
          )}
        </Space>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => navigate('/workspace')}>
            管理空间
          </Button>
        </Space>
      </div>

      {/* Workspace Tabs */}
      <Tabs
        activeKey={currentTabKey}
        onChange={handleTabChange}
        size="large"
        items={WORKSPACE_TABS.map((t) => ({
          key: t.key,
          label: (
            <Space size={6}>
              {t.icon}
              {t.label}
            </Space>
          ),
        }))}
        style={{ marginBottom: 8 }}
      />

      {/* Outlet 渲染当前 tab 对应页面 */}
      <Outlet />
    </div>
  );
}
