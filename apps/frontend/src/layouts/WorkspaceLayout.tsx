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
import './workspace-shell.css';

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
      <div className="workspace-loading">
        <Spin size="large" />
      </div>
    );
  }

  const currentSpace = spaces.find((s) => s.id === spaceId);

  // 空间不存在 → 引导回工作台
  if (spaceId && !currentSpace) {
    return (
      <div className="page-enter workspace-missing">
        <Text className="workspace-missing-copy">找不到该商品空间，可能已被归档或无权访问</Text>
        <Button type="primary" onClick={() => navigate('/workspace')}>
          返回空间列表
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Workspace 顶部：空间切换 + 标题 */}
      <div className="workspace-context-bar">
        <div className="workspace-context-leading">
          <Select
            value={spaceId}
            onChange={handleSwitchSpace}
            className="workspace-space-select"
            size="large"
            options={spaces.map((s) => ({
              value: s.id,
              label: (
                <span className="workspace-space-option">
                  <span>{s.name}</span>
                  {s.isDefault && <Tag color="cyan">默认</Tag>}
                </span>
              ),
            }))}
          />
          {currentSpace?.productName && (
            <Text className="workspace-product-note">主推：{currentSpace.productName}</Text>
          )}
        </div>
        <Button icon={<PlusOutlined />} onClick={() => navigate('/workspace')}>
          管理空间
        </Button>
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
        className="workspace-tabs"
      />

      {/* Outlet 渲染当前 tab 对应页面 */}
      <Outlet />
    </div>
  );
}
