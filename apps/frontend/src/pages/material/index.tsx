import { useEffect, useMemo, useState } from 'react';
import { useShell } from '../../components/layout/shell-context';
import {
  Row, Col, Button, Upload, Input, Space, Tag, Typography,
  Dropdown, Modal, message, Empty, Tooltip, Segmented, Spin,
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, EyeOutlined,
  PictureOutlined, VideoCameraOutlined, FileImageOutlined,
  FilterOutlined, PlusOutlined, CloudUploadOutlined,
  DownloadOutlined, CopyOutlined, AppstoreOutlined, UnorderedListOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { usePageTiming } from '../../hooks/usePerformance';
import { materialApi, MaterialItem } from '../../services/material';
import { useSpaceStore } from '../../store/useSpaceStore';

const { Text } = Typography;
const { Dragger } = Upload;

type ViewMode = 'grid' | 'list';
type MaterialType = 'all' | 'image' | 'video' | 'audio';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  image: { icon: <PictureOutlined />, color: '#6366f1', label: '图片' },
  video: { icon: <VideoCameraOutlined />, color: '#a855f7', label: '视频' },
  audio: { icon: <FileImageOutlined />, color: '#10b981', label: '音频' },
};

const tagColors = ['#6366f1', '#a855f7', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function MaterialPage() {
  const { isMobile } = useShell();
  const activeSpaceId = useSpaceStore((s) => s.activeId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeType, setActiveType] = useState<MaterialType>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, _setSelectedIds] = useState<string[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  usePageTiming('Material');

  /** 拉素材列表 */
  const fetchList = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 100 };
      if (activeSpaceId) params.spaceId = activeSpaceId;
      if (activeType !== 'all') params.type = activeType;
      if (searchText) params.search = searchText;
      const res = await materialApi.getList(params);
      setMaterials(res.list ?? []);
    } catch (err: any) {
      message.error(`加载失败:${err?.message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId, activeType]);

  /** 客户端二次过滤(按 tag 关键字) */
  const filteredMaterials = useMemo(() => {
    if (!searchText) return materials;
    const kw = searchText.toLowerCase();
    return materials.filter((m) => {
      if (m.name?.toLowerCase().includes(kw)) return true;
      if ((m.tags ?? []).some((t) => t.toLowerCase().includes(kw))) return true;
      const allTagText = JSON.stringify({ p: m.productTags, v: m.videoTags, c: m.clipTags }).toLowerCase();
      return allTagText.includes(kw);
    });
  }, [materials, searchText]);

  /** 上传暂时只走"创建一条记录" — 真实文件上传在 P1 阶段(对象存储)做 */
  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const f = file as File;
        const isImage = f.type.startsWith('image/');
        const isVideo = f.type.startsWith('video/');
        const isAudio = f.type.startsWith('audio/');
        const t = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'image';
        // 用 base64 data URL 作为 url(P1 改为对象存储后,直接换 putObject 返回的 URL)
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        await materialApi.create({
          name: f.name,
          type: t as any,
          url: dataUrl,
          size: f.size,
          productSpaceId: activeSpaceId ?? undefined,
        });
        onSuccess?.('ok');
        message.success(`${f.name} 上传成功`);
        fetchList();
      } catch (err: any) {
        onError?.(err);
        message.error(`上传失败:${err?.message ?? '未知错误'}`);
      }
    },
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复,是否继续?',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await materialApi.delete(id);
          message.success('已删除');
          fetchList();
        } catch (err: any) {
          message.error(`删除失败:${err?.message ?? ''}`);
        }
      },
    });
  };

  const handlePreview = (item: MaterialItem) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  };

  const handleAnalyze = async (item: MaterialItem) => {
    setAnalyzingId(item.id);
    try {
      const updated = await materialApi.analyze(item.id, {
        category: item.category,
        description: item.name,
      });
      setMaterials((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
      message.success(`已分析:${(updated.metadata as any)?.caption ?? '完成'}`);
    } catch (err: any) {
      message.error(`分析失败:${err?.response?.data?.message ?? err?.message ?? '未知错误'}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  /** 取一个素材的简短显示标签(优先 tags;其次 productTags.category / videoTags.mood) */
  const displayTags = (m: MaterialItem): string[] => {
    if (m.tags && m.tags.length) return m.tags.slice(0, 3);
    const out: string[] = [];
    const pt: any = m.productTags;
    const vt: any = m.videoTags;
    if (pt?.category) out.push(pt.category);
    if (vt?.mood) out.push(vt.mood);
    if (vt?.style) out.push(vt.style);
    return out.slice(0, 3);
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
                onPressEnter={fetchList}
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
              <Upload {...uploadProps} showUploadList={false}>
                <Button type="primary" icon={<CloudUploadOutlined />}>上传素材</Button>
              </Upload>
            </Space>
          </Col>
        </Row>
      </GlassPanel>

      {/* 上传区(桌面端) */}
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
            拖拽文件到此处,或 <span style={{ color: 'var(--brand-primary)' }}>点击上传</span>
          </p>
          <p className="ant-upload-hint" style={{ color: 'var(--text-tertiary)' }}>
            支持 JPG、PNG、MP4、MP3 格式,单文件最大 200MB
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
      <Spin spinning={loading}>
        {filteredMaterials.length === 0 ? (
          <GlassPanel variant="card" style={{ textAlign: 'center', padding: 60 }}>
            <Empty description={loading ? '加载中...' : '暂无素材'} image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Upload {...uploadProps} showUploadList={false}>
                <Button type="primary" icon={<PlusOutlined />}>上传素材</Button>
              </Upload>
            </Empty>
          </GlassPanel>
        ) : viewMode === 'grid' ? (
          <Row gutter={[16, 16]}>
            {filteredMaterials.map((item) => {
              const tc = typeConfig[item.type];
              const tags = displayTags(item);
              return (
                <Col xs={12} sm={8} md={6} lg={6} xl={4} key={item.id}>
                  <GlassPanel
                    variant="card"
                    style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => handlePreview(item)}
                  >
                    {/* Preview area */}
                    <div style={{
                      height: isMobile ? 100 : 140,
                      background: 'var(--bg-surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      backgroundImage: item.thumbnailUrl
                        ? `url(${item.thumbnailUrl})`
                        : item.type === 'image' && item.url
                        ? `url(${item.url})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}>
                      {!(item.thumbnailUrl || (item.type === 'image' && item.url)) && (
                        <span style={{ fontSize: 36, color: tc.color, opacity: 0.6 }}>{tc.icon}</span>
                      )}
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
                        <Text style={{ color: '#fff', fontSize: 12 }}>{formatSize(item.size)}</Text>
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
                        {tags.map((tag, ti) => (
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
                      <Tooltip title="智能分析(ARK 视觉)">
                        <Button
                          type="text"
                          icon={<ExperimentOutlined spin={analyzingId === item.id} />}
                          style={{ flex: 1, color: 'var(--brand-primary)' }}
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(item); }}
                          loading={analyzingId === item.id}
                          disabled={item.type !== 'image'}
                        />
                      </Tooltip>
                      <Tooltip title="复制链接">
                        <Button type="text" icon={<CopyOutlined />} style={{ flex: 1, color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); if (item.url) { navigator.clipboard.writeText(item.url); message.success('已复制'); } }} />
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
              const tags = displayTags(item);
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
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatSize(item.size)}</Text>
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatDate(item.createdAt)}</Text>
                      {tags.map((tag, ti) => (
                        <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11 }}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                  <Space size={4}>
                    <Tooltip title="预览"><Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                    <Tooltip title="智能分析"><Button type="text" icon={<ExperimentOutlined />} onClick={() => handleAnalyze(item)} loading={analyzingId === item.id} disabled={item.type !== 'image'} style={{ color: 'var(--brand-primary)' }} /></Tooltip>
                    <Tooltip title="下载"><Button type="text" icon={<DownloadOutlined />} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                    <Tooltip title="删除"><Button type="text" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => handleDelete(item.id)} /></Tooltip>
                  </Space>
                </div>
              );
            })}
          </GlassPanel>
        )}
      </Spin>

      {/* Preview Modal */}
      <Modal
        open={previewVisible && !!previewItem}
        title={previewItem?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={720}
      >
        <div style={{ padding: 'var(--spacing-md)' }}>
          {previewItem?.type === 'image' && previewItem.url ? (
            <img src={previewItem.url} alt={previewItem.name} style={{ width: '100%', borderRadius: 8 }} />
          ) : previewItem?.type === 'video' && previewItem.url ? (
            <video src={previewItem.url} controls style={{ width: '100%', borderRadius: 8 }} />
          ) : previewItem?.type === 'audio' && previewItem.url ? (
            <audio src={previewItem.url} controls style={{ width: '100%' }} />
          ) : (
            <Empty description="暂无预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <Space wrap>
              <Text style={{ color: 'var(--text-tertiary)' }}>类型: {previewItem && typeConfig[previewItem.type].label}</Text>
              <Text style={{ color: 'var(--text-tertiary)' }}>大小: {formatSize(previewItem?.size)}</Text>
              <Text style={{ color: 'var(--text-tertiary)' }}>上传: {formatDate(previewItem?.createdAt ?? '')}</Text>
            </Space>
          </div>
          {/* 三层标签展示 */}
          {(previewItem?.productTags || previewItem?.videoTags || previewItem?.clipTags) && (
            <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-surface-2)', borderRadius: 8 }}>
              <Text strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>智能标签</Text>
              {previewItem?.productTags && (
                <div style={{ marginBottom: 6 }}>
                  <Tag color="blue">商品</Tag>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {Object.entries(previewItem.productTags).filter(([, v]) => v).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`).join(' · ')}
                  </Text>
                </div>
              )}
              {previewItem?.videoTags && (
                <div style={{ marginBottom: 6 }}>
                  <Tag color="purple">画面</Tag>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {Object.entries(previewItem.videoTags).filter(([, v]) => v).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`).join(' · ')}
                  </Text>
                </div>
              )}
              {previewItem?.clipTags && (
                <div>
                  <Tag color="cyan">剪辑</Tag>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {Object.entries(previewItem.clipTags).filter(([, v]) => v).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`).join(' · ')}
                  </Text>
                </div>
              )}
              {(previewItem?.metadata as any)?.caption && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="gold">画面描述</Tag>
                  <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{(previewItem?.metadata as any).caption}</Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default MaterialPage;
