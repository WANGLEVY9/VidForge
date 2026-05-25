import { useState } from 'react';
import { useShell } from '../../components/layout/shell-context';
import {
  Row, Col, Button, Upload, Input, Space, Tag, Typography,
  Dropdown, Modal, message, Empty, Tooltip, Segmented,
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, EyeOutlined,
  PictureOutlined, VideoCameraOutlined, FileImageOutlined,
  FilterOutlined, PlusOutlined, CloudUploadOutlined,
  DownloadOutlined, CopyOutlined, AppstoreOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { usePageTiming } from '../../hooks/usePerformance';

const { Text } = Typography;
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
  image: { icon: <PictureOutlined />, color: '#6366f1', label: '图片' },
  video: { icon: <VideoCameraOutlined />, color: '#a855f7', label: '视频' },
  audio: { icon: <FileImageOutlined />, color: '#10b981', label: '音频' },
};

const tagColors = ['#6366f1', '#a855f7', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function MaterialPage() {
  const { isMobile } = useShell();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeType, setActiveType] = useState<MaterialType>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, _setSelectedIds] = useState<string[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  usePageTiming('Material');

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

  const handleDelete = (_id: string) => {
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

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 顶部操作栏 */}
      <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
        <Row gutter={[16, 12]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索素材名称、标签..."
                prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 280, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                allowClear
              />
              <Segmented
                size={isMobile ? 'small' : undefined}
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
                size={isMobile ? 'small' : undefined}
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
              <Button type="primary" icon={<CloudUploadOutlined />}>
                上传素材
              </Button>
            </Space>
          </Col>
        </Row>
      </GlassPanel>

      {/* 上传区 */}
      {!isMobile && (
        <Dragger
          {...uploadProps}
          showUploadList={false}
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '2px dashed var(--border-color)',
            background: 'var(--bg-surface)',
            marginBottom: 'var(--spacing-lg)',
            padding: '20px 0',
          }}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined style={{ fontSize: 40, color: 'var(--brand-primary)' }} />
          </p>
          <p className="ant-upload-text" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            拖拽文件到此处，或 <span style={{ color: 'var(--brand-primary)' }}>点击上传</span>
          </p>
          <p className="ant-upload-hint" style={{ color: 'var(--text-tertiary)' }}>
            支持 JPG、PNG、MP4、MP3 格式，单文件最大 200MB
          </p>
        </Dragger>
      )}

      {/* 统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <Text style={{ color: 'var(--text-tertiary)' }}>
          共 <Text strong style={{ color: 'var(--text-primary)' }}>{filteredMaterials.length}</Text> 个素材
        </Text>
        <Dropdown menu={{ items: [{ key: 'newest', label: '最新上传' }, { key: 'name', label: '按名称' }, { key: 'size', label: '按大小' }] }}>
          <Button type="text" icon={<FilterOutlined />} style={{ color: 'var(--text-secondary)' }}>排序</Button>
        </Dropdown>
      </div>

      {/* 素材内容 */}
      {filteredMaterials.length === 0 ? (
        <GlassPanel variant="card" style={{ textAlign: 'center', padding: 60 }}>
          <Empty description="暂无素材" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />}>上传素材</Button>
          </Empty>
        </GlassPanel>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            return (
              <Col xs={12} sm={8} md={6} lg={6} xl={4} key={item.id}>
                <GlassPanel
                  variant="card"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setPreviewItem(item)}
                >
                  {/* Preview area */}
                  <div style={{
                    height: isMobile ? 100 : 140,
                    background: 'var(--bg-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: 36, color: tc.color, opacity: 0.6 }}>{tc.icon}</span>
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
                  {/* Info */}
                  <div style={{ padding: '8px 12px 12px' }}>
                    <Text
                      ellipsis
                      style={{ display: 'block', fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}
                      title={item.name}
                    >
                      {item.name}
                    </Text>
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.tags.slice(0, 2).map((tag, ti) => (
                        <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11, margin: 0 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                    <Tooltip title="预览">
                      <Button type="text" icon={<EyeOutlined />} style={{ flex: 1, color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); handlePreview(item); }} />
                    </Tooltip>
                    <Tooltip title="复制链接">
                      <Button type="text" icon={<CopyOutlined />} style={{ flex: 1, color: 'var(--text-secondary)' }} />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button type="text" icon={<DeleteOutlined />} style={{ flex: 1, color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} />
                    </Tooltip>
                  </div>
                </GlassPanel>
              </Col>
            );
          })}
        </Row>
      ) : (
        <GlassPanel variant="card" style={{ padding: 0 }}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: `${tc.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: tc.color, fontSize: 20, marginRight: 'var(--spacing-lg)',
                  flexShrink: 0,
                }}>
                  {tc.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ color: 'var(--text-primary)', display: 'block' }}>{item.name}</Text>
                  <Space size={12} style={{ marginTop: 2 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.size}</Text>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.createdAt}</Text>
                    {item.tags.map((tag, ti) => (
                      <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
                <Space size={4}>
                  <Tooltip title="预览"><Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                  <Tooltip title="下载"><Button type="text" icon={<DownloadOutlined />} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                  <Tooltip title="删除"><Button type="text" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => handleDelete(item.id)} /></Tooltip>
                </Space>
              </div>
            );
          })}
        </GlassPanel>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewVisible && !!previewItem}
        title={previewItem?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={640}
      >
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <Empty description="素材预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <Space>
              <Text style={{ color: 'var(--text-tertiary)' }}>类型: {previewItem && typeConfig[previewItem.type].label}</Text>
              <Text style={{ color: 'var(--text-tertiary)' }}>大小: {previewItem?.size}</Text>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MaterialPage;
