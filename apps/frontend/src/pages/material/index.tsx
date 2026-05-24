import { useState } from 'react';
import {
  Row, Col, Card, Button, Upload, Tabs, Input, Space, Tag, Typography,
  Dropdown, Modal, message, Image, Empty, Tooltip, Segmented, Badge,
} from 'antd';
import {
  UploadOutlined, SearchOutlined, DeleteOutlined, EyeOutlined,
  PictureOutlined, VideoCameraOutlined, FileImageOutlined,
  FolderOutlined, FilterOutlined, PlusOutlined, CloudUploadOutlined,
  DownloadOutlined, CopyOutlined, AppstoreOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { theme } from '../../theme/tokens';

const { Title, Text } = Typography;
const { Dragger } = Upload;

type ViewMode = 'grid' | 'list';
type MaterialType = 'all' | 'image' | 'video' | 'audio';

interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  size: string;
  url: string;
  thumbnail?: string;
  tags: string[];
  createdAt: string;
}

const mockMaterials: MaterialItem[] = [
  { id: '1', name: '连衣裙主图-白底.jpg', type: 'image', size: '2.4 MB', url: '', thumbnail: '', tags: ['服饰', '白底图'], createdAt: '2024-05-24' },
  { id: '2', name: '耳机产品展示.mp4', type: 'video', size: '18.6 MB', url: '', tags: ['数码', '产品展示'], createdAt: '2024-05-24' },
  { id: '3', name: '护肤品场景图.jpg', type: 'image', size: '3.1 MB', url: '', thumbnail: '', tags: ['美妆', '场景图'], createdAt: '2024-05-23' },
  { id: '4', name: '运动鞋上脚视频.mp4', type: 'video', size: '24.2 MB', url: '', tags: ['鞋包', '上脚'], createdAt: '2024-05-23' },
  { id: '5', name: '零食特写图.jpg', type: 'image', size: '1.8 MB', url: '', thumbnail: '', tags: ['食品', '特写'], createdAt: '2024-05-22' },
  { id: '6', name: '背景音乐-轻快.mp3', type: 'audio', size: '4.5 MB', url: '', tags: ['BGM', '轻快'], createdAt: '2024-05-22' },
  { id: '7', name: '家居氛围图.jpg', type: 'image', size: '2.9 MB', url: '', thumbnail: '', tags: ['家居', '氛围'], createdAt: '2024-05-21' },
  { id: '8', name: '口红试色视频.mp4', type: 'video', size: '15.3 MB', url: '', tags: ['美妆', '试色'], createdAt: '2024-05-21' },
];

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  image: { icon: <PictureOutlined />, color: theme.colors.primary, label: '图片' },
  video: { icon: <VideoCameraOutlined />, color: theme.colors.secondary, label: '视频' },
  audio: { icon: <FileImageOutlined />, color: theme.colors.success, label: '音频' },
};

function MaterialPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeType, setActiveType] = useState<MaterialType>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const filteredMaterials = mockMaterials.filter((m) => {
    const matchType = activeType === 'all' || m.type === activeType;
    const matchSearch = !searchText || m.name.toLowerCase().includes(searchText.toLowerCase()) || m.tags.some((t) => t.includes(searchText));
    return matchType && matchSearch;
  });

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    customRequest: ({ onSuccess }) => {
      setTimeout(() => {
        onSuccess?.('ok');
        message.success('上传成功');
      }, 800);
    },
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => message.success('已删除'),
    });
  };

  const handlePreview = (item: MaterialItem) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  };

  const tagColors = ['blue', 'purple', 'cyan', 'geekblue', 'magenta', 'volcano', 'gold', 'green'];

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 顶部操作栏 */}
      <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }} styles={{ body: { padding: `${theme.spacing.lg}px ${theme.spacing.xl}px` } }}>
        <Row gutter={[16, 12]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索素材名称、标签..."
                prefix={<SearchOutlined style={{ color: theme.colors.textTertiary }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 280, borderRadius: theme.borderRadius.md }}
                allowClear
              />
              <Segmented
                options={[
                  { label: '全部', value: 'all' },
                  { label: <Space><PictureOutlined />图片</Space>, value: 'image' },
                  { label: <Space><VideoCameraOutlined />视频</Space>, value: 'video' },
                  { label: <Space><FileImageOutlined />音频</Space>, value: 'audio' },
                ]}
                value={activeType}
                onChange={(v) => setActiveType(v as MaterialType)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Segmented
                options={[
                  { value: 'grid', icon: <AppstoreOutlined /> },
                  { value: 'list', icon: <UnorderedListOutlined /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
              />
              {selectedIds.length > 0 && (
                <Button danger icon={<DeleteOutlined />}>批量删除 ({selectedIds.length})</Button>
              )}
              <Button type="primary" icon={<CloudUploadOutlined />} style={{ borderRadius: theme.borderRadius.md }}>
                上传素材
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 拖拽上传区 */}
      <Dragger
        {...uploadProps}
        showUploadList={false}
        style={{
          borderRadius: theme.borderRadius.lg,
          border: `2px dashed ${theme.colors.borderColor}`,
          background: theme.colors.bgContainer,
          marginBottom: theme.spacing.lg,
          padding: '20px 0',
        }}
      >
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined style={{ fontSize: 40, color: theme.colors.primary }} />
        </p>
        <p className="ant-upload-text" style={{ color: theme.colors.textPrimary, fontWeight: 600 }}>
          拖拽文件到此处，或 <span style={{ color: theme.colors.primary }}>点击上传</span>
        </p>
        <p className="ant-upload-hint" style={{ color: theme.colors.textTertiary }}>
          支持 JPG、PNG、MP4、MP3 格式，单文件最大 200MB
        </p>
      </Dragger>

      {/* 素材统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Text type="secondary">
          共 <Text strong style={{ color: theme.colors.textPrimary }}>{filteredMaterials.length}</Text> 个素材
        </Text>
        <Space>
          <Dropdown menu={{ items: [{ key: 'newest', label: '最新上传' }, { key: 'name', label: '按名称' }, { key: 'size', label: '按大小' }] }}>
            <Button type="text" icon={<FilterOutlined />}>排序</Button>
          </Dropdown>
        </Space>
      </div>

      {/* 素材网格 */}
      {filteredMaterials.length === 0 ? (
        <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', textAlign: 'center', padding: 60 }}>
          <Empty description="暂无素材" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />}>上传素材</Button>
          </Empty>
        </Card>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredMaterials.map((item, idx) => {
            const tc = typeConfig[item.type];
            return (
              <Col xs={12} sm={8} md={6} lg={6} xl={4} key={item.id}>
                <Card
                  hoverable
                  className="hover-lift"
                  style={{ borderRadius: theme.borderRadius.lg, overflow: 'hidden' }}
                  styles={{ body: { padding: 0 } }}
                  cover={
                    <div style={{
                      height: 140,
                      background: theme.colors.bgSpotlight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <div style={{ fontSize: 36, color: tc.color, opacity: 0.6 }}>{tc.icon}</div>
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 6px',
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11 }}>{item.type.toUpperCase()}</Text>
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        padding: '8px 12px',
                      }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>{item.size}</Text>
                      </div>
                    </div>
                  }
                  actions={[
                    <Tooltip title="预览" key="preview"><EyeOutlined /></Tooltip>,
                    <Tooltip title="复制链接" key="copy"><CopyOutlined /></Tooltip>,
                    <Tooltip title="删除" key="delete"><DeleteOutlined style={{ color: theme.colors.error }} /></Tooltip>,
                  ]}
                >
                  <div style={{ padding: '8px 12px 4px' }}>
                    <Text ellipsis style={{ display: 'block', fontWeight: 500, fontSize: 13, color: theme.colors.textPrimary }} title={item.name}>
                      {item.name}
                    </Text>
                    <div style={{ marginTop: 6 }}>
                      {item.tags.slice(0, 2).map((tag, ti) => (
                        <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11, marginRight: 4 }}>{tag}</Tag>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none' }} styles={{ body: { padding: 0 } }}>
          {filteredMaterials.map((item, idx) => {
            const tc = typeConfig[item.type];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', padding: `${theme.spacing.md}px ${theme.spacing.xl}px`,
                  borderBottom: `1px solid ${theme.colors.borderColorSecondary}`,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.bgSpotlight)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: theme.borderRadius.md,
                  background: `${tc.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: tc.color, fontSize: 20, marginRight: theme.spacing.lg,
                  flexShrink: 0,
                }}>
                  {tc.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ color: theme.colors.textPrimary, display: 'block' }}>{item.name}</Text>
                  <Space size={12} style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.size}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.createdAt}</Text>
                    {item.tags.map((tag, ti) => (
                      <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
                <Space size={4}>
                  <Tooltip title="预览"><Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} /></Tooltip>
                  <Tooltip title="下载"><Button type="text" icon={<DownloadOutlined />} /></Tooltip>
                  <Tooltip title="删除"><Button type="text" icon={<DeleteOutlined />} style={{ color: theme.colors.error }} onClick={() => handleDelete(item.id)} /></Tooltip>
                </Space>
              </div>
            );
          })}
        </Card>
      )}

      {/* 预览弹窗 */}
      <Modal
        open={previewVisible}
        title={previewItem?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={640}
      >
        <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
          <Empty description="素材预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <div style={{ marginTop: theme.spacing.lg }}>
            <Space>
              <Text type="secondary">类型: {previewItem && typeConfig[previewItem.type].label}</Text>
              <Text type="secondary">大小: {previewItem?.size}</Text>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MaterialPage;
