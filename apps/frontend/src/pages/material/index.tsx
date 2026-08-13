import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useShell } from '../../components/layout/shell-context';
import {
  Row,
  Col,
  Button,
  Upload,
  Input,
  Space,
  Tag,
  Typography,
  Dropdown,
  Modal,
  message,
  Empty,
  Tooltip,
  Segmented,
  Skeleton,
  List,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  PlusOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  CopyOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExperimentOutlined,
  SortAscendingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FileOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps, MenuProps } from 'antd';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { usePageTiming } from '../../hooks/usePerformance';
import { materialApi, MaterialItem } from '../../services/material';
import { useSpaceStore } from '../../store/useSpaceStore';

const { Text } = Typography;
const { Dragger } = Upload;

/** 上传队列中的单个条目 */
interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  material?: MaterialItem;
  errorMsg?: string;
}

type ViewMode = 'grid' | 'list';
type MaterialType = 'all' | 'image' | 'video' | 'audio';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  image: { icon: <PictureOutlined />, color: '#6366f1', label: '图片' },
  video: { icon: <VideoCameraOutlined />, color: '#a855f7', label: '视频' },
  audio: { icon: <FileImageOutlined />, color: '#10b981', label: '音频' },
};

const tagColors = [
  '#6366f1',
  '#a855f7',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
];

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

/** 排序选项 */
const sortOptions: {
  key: string;
  label: string;
  orderBy: string;
  orderDirection: 'ASC' | 'DESC';
}[] = [
  { key: 'newest', label: '最新上传', orderBy: 'createdAt', orderDirection: 'DESC' },
  { key: 'oldest', label: '最早上传', orderBy: 'createdAt', orderDirection: 'ASC' },
  { key: 'name_asc', label: '按名称 A-Z', orderBy: 'name', orderDirection: 'ASC' },
  { key: 'name_desc', label: '按名称 Z-A', orderBy: 'name', orderDirection: 'DESC' },
  { key: 'size_desc', label: '按大小从大到小', orderBy: 'size', orderDirection: 'DESC' },
  { key: 'size_asc', label: '按大小从小到大', orderBy: 'size', orderDirection: 'ASC' },
];

/** 从三层标签中提取可过滤的标签项 */
function extractTagFilters(materials: MaterialItem[]): {
  categories: string[];
  moods: string[];
  styles: string[];
} {
  const cats = new Set<string>();
  const moods = new Set<string>();
  const styles = new Set<string>();
  for (const m of materials) {
    const pt = m.productTags as Record<string, any> | null;
    const vt = m.videoTags as Record<string, any> | null;
    if (pt?.category && pt.category !== '其他') cats.add(pt.category);
    if (vt?.mood) moods.add(vt.mood);
    if (vt?.style) styles.add(vt.style);
  }
  return {
    categories: [...cats].sort(),
    moods: [...moods].sort(),
    styles: [...styles].sort(),
  };
}

/** 骨架卡片 */
function SkeletonCard() {
  return (
    <GlassPanel variant="card" style={{ padding: 0, overflow: 'hidden' }}>
      <Skeleton.Image style={{ width: '100%', height: 140, borderRadius: 0 }} active />
      <div style={{ padding: '8px 12px 12px' }}>
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: '80%' }} />
      </div>
    </GlassPanel>
  );
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
  const [previewMediaError, setPreviewMediaError] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [queueExpanded, setQueueExpanded] = useState(true);
  const queueIdCounter = useRef(0);
  const uploadQueueRef = useRef<UploadQueueItem[]>([]);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // 排序状态
  const [sortKey, setSortKey] = useState('newest');
  const currentSort = sortOptions.find((o) => o.key === sortKey) ?? sortOptions[0];

  // 标签过滤
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [filterStyle, setFilterStyle] = useState<string | null>(null);

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => {
    return () => {
      uploadQueueRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  usePageTiming('Material');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        pageSize: 100,
        orderBy: currentSort.orderBy,
        orderDirection: currentSort.orderDirection,
      };
      if (activeSpaceId) params.spaceId = activeSpaceId;
      if (activeType !== 'all') params.type = activeType;
      if (searchText) params.search = searchText;
      const res = await materialApi.getList(params);
      setMaterials(res.list ?? []);
    } catch (err: any) {
      message.error(`加载失败:${err?.response?.data?.message ?? err?.message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [activeSpaceId, activeType, searchText, currentSort.orderBy, currentSort.orderDirection]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /** 提取标签过滤选项(基于当前加载的素材) */
  const tagFilters = useMemo(() => extractTagFilters(materials), [materials]);

  /** 客户端二次过滤(搜索 + 标签) */
  const filteredMaterials = useMemo(() => {
    let list = materials;
    // 文本搜索
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter((m) => {
        if (m.name?.toLowerCase().includes(kw)) return true;
        if ((m.tags ?? []).some((t) => t.toLowerCase().includes(kw))) return true;
        return false;
      });
    }
    // 标签过滤
    if (filterCategory || filterMood || filterStyle) {
      list = list.filter((m) => {
        const pt = m.productTags as Record<string, any> | null;
        const vt = m.videoTags as Record<string, any> | null;
        if (filterCategory && pt?.category !== filterCategory) return false;
        if (filterMood && vt?.mood !== filterMood) return false;
        if (filterStyle && vt?.style !== filterStyle) return false;
        return true;
      });
    }
    return list;
  }, [materials, searchText, filterCategory, filterMood, filterStyle]);

  const processUpload = useCallback(
    async (
      file: File,
      queueId: string,
      callbacks: Pick<
        Parameters<NonNullable<UploadProps['customRequest']>>[0],
        'onSuccess' | 'onError' | 'onProgress'
      > = {}
    ) => {
      try {
        const result = await materialApi.upload(
          file,
          { productSpaceId: activeSpaceId ?? undefined },
          (event) => {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === queueId ? { ...q, progress: percent } : q))
            );
            callbacks.onProgress?.({ percent });
          }
        );
        callbacks.onSuccess?.('ok');
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId
              ? { ...q, status: 'done' as const, progress: 100, material: result }
              : q
          )
        );
        message.success(`${file.name} 上传成功`);
        fetchList();
      } catch (err: any) {
        callbacks.onError?.(err);
        const detail = err?.response?.data?.message ?? err?.message ?? '未知错误';
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, status: 'error' as const, errorMsg: detail } : q
          )
        );
        message.error(`上传失败:${detail}`);
      }
    },
    [activeSpaceId, fetchList]
  );

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    customRequest: ({ file, onSuccess, onError, onProgress }) => {
      const f = file as File;
      const queueId = `upload_${++queueIdCounter.current}`;
      const previewUrl =
        f.type.startsWith('image/') || f.type.startsWith('video/') ? URL.createObjectURL(f) : '';
      setUploadQueue((prev) => [
        { id: queueId, file: f, previewUrl, progress: 0, status: 'uploading' },
        ...prev,
      ]);
      setQueueExpanded(true);
      void processUpload(f, queueId, { onSuccess, onError, onProgress });
    },
  };

  const retryUpload = (item: UploadQueueItem) => {
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? { ...q, status: 'uploading' as const, progress: 0, errorMsg: undefined }
          : q
      )
    );
    void processUpload(item.file, item.id);
  };

  /** 从队列中移除条目 */
  const removeQueueItem = (id: string) => {
    const item = uploadQueue.find((q) => q.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  /** 清除所有已完成的队列条目 */
  const clearDoneQueue = () => {
    uploadQueue.forEach((q) => {
      if (q.status === 'done' && q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });
    setUploadQueue((prev) => prev.filter((q) => q.status !== 'done'));
  };

  /** 在队列中预览素材 */
  const handleQueuePreview = (item: UploadQueueItem) => {
    if (item.material) {
      handlePreview(item.material);
    }
  };

  /** 图标：根据文件类型返回对应图标 */
  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <PictureOutlined />;
    if (file.type.startsWith('video/')) return <VideoCameraOutlined />;
    if (file.type.startsWith('audio/')) return <FileImageOutlined />;
    return <FileOutlined />;
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
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
    setPreviewMediaError(false);
    setPreviewVisible(true);
  };

  const handlePreviewKeyDown = (event: React.KeyboardEvent, item: MaterialItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePreview(item);
    }
  };

  const handleDownload = (item: MaterialItem) => {
    if (!item.url) {
      message.info('该素材暂无可下载地址');
      return;
    }
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  const handleAnalyze = async (item: MaterialItem) => {
    setAnalyzingId(item.id);
    message.loading({ content: '正在分析素材...', key: `analyze_${item.id}`, duration: 0 });
    try {
      const updated = await materialApi.analyze(item.id, {
        category: item.category,
        description: item.name,
      });
      // 更新本地状态
      setMaterials((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
      setPreviewItem((current) => (current?.id === item.id ? updated : current));
      const caption = (updated.metadata as any)?.caption ?? '完成';
      const hasAiTags = !!(updated.productTags || updated.videoTags || updated.clipTags);
      message.success({
        content: hasAiTags ? `AI 分析完成: ${caption}` : '分析完成（使用了基础标签）',
        key: `analyze_${item.id}`,
        duration: 3,
      });
      // 刷新列表确保数据一致
      fetchList();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message ?? err?.message ?? '未知错误';
      console.error('[analyze error]', err, errMsg);
      message.error({
        content: `分析失败: ${errMsg}`,
        key: `analyze_${item.id}`,
        duration: 4,
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  /** 取素材的显示标签(优先 user tags;其次 AI 三层标签) */
  const displayTags = (m: MaterialItem): { text: string; color: string; type: 'user' | 'ai' }[] => {
    const result: { text: string; color: string; type: 'user' | 'ai' }[] = [];
    if (m.tags && m.tags.length) {
      m.tags.slice(0, 3).forEach((t, i) => {
        result.push({ text: t, color: tagColors[i % tagColors.length], type: 'user' });
      });
      return result;
    }
    const pt: any = m.productTags;
    const vt: any = m.videoTags;
    if (pt?.category && pt.category !== '其他')
      result.push({ text: pt.category, color: '#6366f1', type: 'ai' });
    if (vt?.mood) result.push({ text: vt.mood, color: '#ec4899', type: 'ai' });
    if (vt?.style) result.push({ text: vt.style, color: '#06b6d4', type: 'ai' });
    return result.slice(0, 3);
  };

  /** 判断素材是否已分析(有三层标签) */
  const isAnalyzed = (m: MaterialItem): boolean => {
    return !!(m.productTags || m.videoTags || m.clipTags);
  };

  const sortMenuItems: MenuProps['items'] = sortOptions.map((opt) => ({
    key: opt.key,
    label: opt.label,
    icon: <SortAscendingOutlined />,
  }));

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* ─── 顶部操作栏 ─── */}
      <GlassPanel
        variant="card"
        style={{
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md) var(--spacing-xl)',
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99,102,241,0.03) 100%)',
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索素材名称、标签..."
                prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={fetchList}
                style={{
                  width: isMobile ? '100%' : 260,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-2)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                allowClear
              />
              <Segmented
                size={isMobile ? 'small' : 'middle'}
                options={[
                  { label: '全部', value: 'all' },
                  {
                    label: (
                      <Space size={4}>
                        <PictureOutlined />
                        图片
                      </Space>
                    ),
                    value: 'image',
                  },
                  {
                    label: (
                      <Space size={4}>
                        <VideoCameraOutlined />
                        视频
                      </Space>
                    ),
                    value: 'video',
                  },
                  {
                    label: (
                      <Space size={4}>
                        <FileImageOutlined />
                        音频
                      </Space>
                    ),
                    value: 'audio',
                  },
                ]}
                value={activeType}
                onChange={(v) => setActiveType(v as MaterialType)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Segmented
                size={isMobile ? 'small' : 'middle'}
                options={[
                  { value: 'grid', icon: <AppstoreOutlined /> },
                  { value: 'list', icon: <UnorderedListOutlined /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
              />
              {selectedIds.length > 0 && (
                <Button danger icon={<DeleteOutlined />} size={isMobile ? 'small' : 'middle'}>
                  批量删除 ({selectedIds.length})
                </Button>
              )}
              {uploadQueue.length > 0 && (
                <Button
                  icon={<CloudUploadOutlined />}
                  onClick={() => setQueueExpanded(!queueExpanded)}
                  type={queueExpanded ? 'primary' : 'default'}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  上传队列 ({uploadQueue.length})
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </GlassPanel>

      {/* ─── 排序 + 标签过滤栏 ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <Space size={8} wrap>
          {/* 排序 */}
          <Dropdown
            menu={{
              items: sortMenuItems,
              selectedKeys: [sortKey],
              onClick: ({ key }) => setSortKey(key),
            }}
            trigger={['click']}
          >
            <Button
              size="small"
              icon={<SortAscendingOutlined />}
              style={{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}
            >
              {currentSort.label}
            </Button>
          </Dropdown>

          {/* 品类过滤 */}
          {tagFilters.categories.length > 0 && (
            <Space size={4} wrap>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>品类:</Text>
              <Tag
                style={{ borderRadius: 12, cursor: 'pointer', fontSize: 11, margin: 0 }}
                color={filterCategory === null ? 'blue' : undefined}
                onClick={() => setFilterCategory(null)}
              >
                全部
              </Tag>
              {tagFilters.categories.map((c) => (
                <Tag
                  key={c}
                  style={{ borderRadius: 12, cursor: 'pointer', fontSize: 11, margin: 0 }}
                  color={filterCategory === c ? 'blue' : 'default'}
                  onClick={() => setFilterCategory(filterCategory === c ? null : c)}
                >
                  {c}
                </Tag>
              ))}
            </Space>
          )}

          {/* 情绪过滤 */}
          {tagFilters.moods.length > 0 && (
            <Space size={4} wrap>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>情绪:</Text>
              {tagFilters.moods.map((m) => (
                <Tag
                  key={m}
                  style={{ borderRadius: 12, cursor: 'pointer', fontSize: 11, margin: 0 }}
                  color={filterMood === m ? 'pink' : 'default'}
                  onClick={() => setFilterMood(filterMood === m ? null : m)}
                >
                  {m}
                </Tag>
              ))}
            </Space>
          )}

          {/* 风格过滤 */}
          {tagFilters.styles.length > 0 && (
            <Space size={4} wrap>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>风格:</Text>
              {tagFilters.styles.map((s) => (
                <Tag
                  key={s}
                  style={{ borderRadius: 12, cursor: 'pointer', fontSize: 11, margin: 0 }}
                  color={filterStyle === s ? 'cyan' : 'default'}
                  onClick={() => setFilterStyle(filterStyle === s ? null : s)}
                >
                  {s}
                </Tag>
              ))}
            </Space>
          )}
        </Space>

        <Text style={{ color: 'var(--text-tertiary)', fontSize: 13, whiteSpace: 'nowrap' }}>
          共{' '}
          <Text strong style={{ color: 'var(--text-primary)' }}>
            {filteredMaterials.length}
          </Text>{' '}
          个素材
        </Text>
      </div>

      {/* ─── 上传拖拽区(桌面端) ─── */}
      {!isMobile && (
        <Dragger
          {...uploadProps}
          showUploadList={false}
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '2px dashed var(--border-color)',
            background: 'var(--bg-surface)',
            marginBottom: 'var(--spacing-lg)',
            padding: '16px 0',
            transition: 'border-color 0.3s, background 0.3s',
          }}
          className="upload-dragger-hover"
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined style={{ fontSize: 36, color: 'var(--brand-primary)' }} />
          </p>
          <p
            className="ant-upload-text"
            style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}
          >
            拖拽文件到此处，或 <span style={{ color: 'var(--brand-primary)' }}>点击浏览</span>
          </p>
          <p className="ant-upload-hint" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
            支持 JPG / PNG / WebP / MP4 / MP3，单文件最大 200MB
          </p>
        </Dragger>
      )}

      {/* ─── 上传队列 ─── */}
      {uploadQueue.length > 0 && queueExpanded && (
        <GlassPanel
          variant="card"
          style={{
            marginBottom: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            border: '1px solid var(--brand-primary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: uploadQueue.length > 0 ? 12 : 0,
            }}
          >
            <Space>
              <CloudUploadOutlined style={{ color: 'var(--brand-primary)' }} />
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                上传队列
              </Text>
              <Tag style={{ borderRadius: 12 }}>
                {uploadQueue.filter((q) => q.status === 'uploading').length} 进行中
              </Tag>
            </Space>
            <Space size={4}>
              {uploadQueue.some((q) => q.status === 'done') && (
                <Button size="small" type="text" onClick={clearDoneQueue}>
                  清除已完成
                </Button>
              )}
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setQueueExpanded(false)}
              />
            </Space>
          </div>
          <List
            size="small"
            dataSource={uploadQueue}
            renderItem={(item, index) => (
              <List.Item
                style={{
                  padding: '8px 4px',
                  opacity: item.status === 'done' ? 0.7 : 1,
                }}
                actions={[
                  item.material && (
                    <Tooltip title="预览" key="preview">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleQueuePreview(item)}
                      />
                    </Tooltip>
                  ),
                  item.status === 'error' && (
                    <Tooltip title="重试上传" key="retry">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => retryUpload(item)}
                      />
                    </Tooltip>
                  ),
                  <Tooltip title="移除" key="remove">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeQueueItem(item.id)}
                    />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-surface-2)',
                        fontSize: 18,
                        color: 'var(--text-tertiary)',
                        position: 'relative',
                      }}
                    >
                      {/* 序号 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 16,
                          height: 16,
                          background: 'var(--brand-primary)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px 0 6px 0',
                          lineHeight: 1,
                        }}
                      >
                        {index + 1}
                      </div>
                      {/* 图片预览或文件图标 */}
                      {item.previewUrl && item.file.type.startsWith('image/') ? (
                        <img
                          src={item.previewUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : item.previewUrl && item.file.type.startsWith('video/') ? (
                        <video
                          src={item.previewUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted
                        />
                      ) : (
                        getFileTypeIcon(item.file)
                      )}
                    </div>
                  }
                  title={
                    <Space size={4}>
                      <Text
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          maxWidth: 240,
                        }}
                        ellipsis
                      >
                        {item.file.name}
                      </Text>
                      {item.status === 'done' && (
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                      )}
                      {item.status === 'error' && (
                        <CloseOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                      )}
                    </Space>
                  }
                  description={
                    <Space size={8}>
                      <Text style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                        {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                      {item.status === 'uploading' && (
                        <Text style={{ color: 'var(--brand-primary)', fontSize: 11 }}>
                          <LoadingOutlined /> 上传中 {item.progress}%
                        </Text>
                      )}
                      {item.status === 'done' && (
                        <Text style={{ color: '#52c41a', fontSize: 11 }}>已完成</Text>
                      )}
                      {item.status === 'error' && (
                        <Text style={{ color: '#ff4d4f', fontSize: 11 }}>
                          {item.errorMsg || '上传失败'}
                        </Text>
                      )}
                    </Space>
                  }
                />
                {item.status === 'uploading' && (
                  <Progress
                    percent={item.progress}
                    size="small"
                    showInfo={false}
                    status="active"
                    style={{ width: 140, margin: 0 }}
                  />
                )}
              </List.Item>
            )}
          />
        </GlassPanel>
      )}

      {/* ─── 素材内容 ─── */}
      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Col xs={12} sm={8} md={6} lg={6} xl={4} key={i}>
              <SkeletonCard />
            </Col>
          ))}
        </Row>
      ) : filteredMaterials.length === 0 ? (
        <GlassPanel
          variant="card"
          style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)',
          }}
        >
          <div
            style={{ fontSize: 56, color: 'var(--text-tertiary)', marginBottom: 16, opacity: 0.5 }}
          >
            <PictureOutlined />
          </div>
          <Text
            style={{
              color: 'var(--text-secondary)',
              fontSize: 16,
              display: 'block',
              marginBottom: 8,
            }}
          >
            {materials.length === 0 ? '还没有素材，开始上传吧' : '没有匹配的素材'}
          </Text>
          <Text
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 13,
              display: 'block',
              marginBottom: 24,
            }}
          >
            {materials.length === 0
              ? '上传商品图片、视频素材，AI 将自动分析并生成标签'
              : '试试调整过滤条件或搜索关键词'}
          </Text>
          {materials.length === 0 && (
            <Upload {...uploadProps} showUploadList={false}>
              <Button type="primary" icon={<PlusOutlined />} size="large">
                上传素材
              </Button>
            </Upload>
          )}
        </GlassPanel>
      ) : viewMode === 'grid' ? (
        /* ─── 网格视图 ─── */
        <Row gutter={[16, 16]}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            const tags = displayTags(item);
            const analyzed = isAnalyzed(item);
            return (
              <Col xs={12} sm={8} md={6} lg={6} xl={4} key={item.id}>
                <GlassPanel
                  variant="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  className="material-card-hover"
                  onClick={() => handlePreview(item)}
                  onKeyDown={(event) => handlePreviewKeyDown(event, item)}
                  role="button"
                  tabIndex={0}
                  aria-label={`预览素材：${item.name}`}
                >
                  {/* 预览区 */}
                  <div
                    style={{
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
                    }}
                  >
                    {!(item.thumbnailUrl || (item.type === 'image' && item.url)) && (
                      <span style={{ fontSize: 36, color: tc.color, opacity: 0.5 }}>{tc.icon}</span>
                    )}
                    {/* 类型角标 */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: `${tc.color}dd`,
                        borderRadius: 6,
                        padding: '1px 8px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>
                        {item.type.toUpperCase()}
                      </Text>
                    </div>
                    {/* AI 分析状态 */}
                    {analyzed && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          background: 'rgba(16,185,129,0.85)',
                          borderRadius: 12,
                          padding: '1px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <CheckCircleOutlined style={{ fontSize: 10, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontSize: 10 }}>已分析</Text>
                      </div>
                    )}
                    {/* 底部渐变信息 */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        padding: '6px 10px',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11 }}>{formatSize(item.size)}</Text>
                    </div>
                  </div>
                  {/* 信息区 */}
                  <div style={{ padding: '8px 12px 10px' }}>
                    <Text
                      ellipsis
                      style={{
                        display: 'block',
                        fontWeight: 500,
                        fontSize: 13,
                        color: 'var(--text-primary)',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </Text>
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        gap: 4,
                        flexWrap: 'wrap',
                        minHeight: 22,
                      }}
                    >
                      {tags.map((tag, ti) => (
                        <Tag
                          key={ti}
                          color={tag.color}
                          style={{
                            borderRadius: 20,
                            fontSize: 10,
                            margin: 0,
                            lineHeight: '18px',
                            padding: '0 6px',
                          }}
                        >
                          {tag.type === 'ai' && (
                            <ExperimentOutlined style={{ fontSize: 9, marginRight: 2 }} />
                          )}
                          {tag.text}
                        </Tag>
                      ))}
                      {!analyzed && item.type !== 'audio' && (
                        <Tag
                          color="default"
                          style={{
                            borderRadius: 20,
                            fontSize: 10,
                            margin: 0,
                            lineHeight: '18px',
                            padding: '0 6px',
                            opacity: 0.6,
                          }}
                          icon={<ClockCircleOutlined />}
                        >
                          待分析
                        </Tag>
                      )}
                    </div>
                  </div>
                  {/* 操作栏 */}
                  <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                    <Tooltip title="预览">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        style={{ flex: 1, color: 'var(--text-secondary)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(item);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title={analyzed ? '重新分析' : 'AI 智能分析'}>
                      <Button
                        type="text"
                        icon={<ExperimentOutlined spin={analyzingId === item.id} />}
                        style={{
                          flex: 1,
                          color: analyzed ? 'var(--text-secondary)' : 'var(--brand-primary)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(item);
                        }}
                        loading={analyzingId === item.id}
                        disabled={item.type === 'audio'}
                      />
                    </Tooltip>
                    <Tooltip title="复制链接">
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        style={{ flex: 1, color: 'var(--text-secondary)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.url) {
                            navigator.clipboard.writeText(item.url);
                            message.success('已复制');
                          }
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        style={{ flex: 1, color: '#ef4444' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      />
                    </Tooltip>
                  </div>
                </GlassPanel>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* ─── 列表视图 ─── */
        <GlassPanel variant="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            const tags = displayTags(item);
            const analyzed = isAnalyzed(item);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={() => handlePreview(item)}
                onKeyDown={(event) => handlePreviewKeyDown(event, item)}
                role="button"
                tabIndex={0}
                aria-label={`预览素材：${item.name}`}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: `${tc.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tc.color,
                    fontSize: 20,
                    marginRight: 'var(--spacing-lg)',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {tc.icon}
                  {analyzed && (
                    <CheckCircleOutlined
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        fontSize: 12,
                        color: '#10b981',
                        background: 'var(--bg-surface)',
                        borderRadius: 10,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                    {item.name}
                  </Text>
                  <Space size={8} style={{ marginTop: 2 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {formatSize(item.size)}
                    </Text>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {formatDate(item.createdAt)}
                    </Text>
                    {tags.slice(0, 2).map((tag, ti) => (
                      <Tag
                        key={ti}
                        color={tag.color}
                        style={{
                          borderRadius: 20,
                          fontSize: 10,
                          lineHeight: '18px',
                          padding: '0 6px',
                          margin: 0,
                        }}
                      >
                        {tag.type === 'ai' && (
                          <ExperimentOutlined style={{ fontSize: 9, marginRight: 2 }} />
                        )}
                        {tag.text}
                      </Tag>
                    ))}
                    {!analyzed && item.type !== 'audio' && (
                      <Tag
                        style={{ borderRadius: 20, fontSize: 10, margin: 0, opacity: 0.6 }}
                        icon={<ClockCircleOutlined />}
                      >
                        待分析
                      </Tag>
                    )}
                  </Space>
                </div>
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="预览">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(item)}
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  </Tooltip>
                  <Tooltip title={analyzed ? '重新分析' : '智能分析'}>
                    <Button
                      type="text"
                      icon={<ExperimentOutlined />}
                      onClick={() => handleAnalyze(item)}
                      loading={analyzingId === item.id}
                      disabled={item.type === 'audio'}
                      style={{ color: analyzed ? 'var(--text-secondary)' : 'var(--brand-primary)' }}
                    />
                  </Tooltip>
                  <Tooltip title="下载">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => handleDownload(item)}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(item.id)}
                    />
                  </Tooltip>
                </Space>
              </div>
            );
          })}
        </GlassPanel>
      )}

      {/* ─── 预览弹窗 ─── */}
      <Modal
        open={previewVisible && !!previewItem}
        title={
          <Space>
            <span>{previewItem?.name}</span>
            {previewItem && (
              <Tag color={typeConfig[previewItem.type]?.color} style={{ borderRadius: 12 }}>
                {typeConfig[previewItem.type]?.label}
              </Tag>
            )}
          </Space>
        }
        footer={
          <Space>
            <Button onClick={() => setPreviewVisible(false)}>关闭</Button>
            {previewItem && previewItem.type !== 'audio' && (
              <Button
                icon={<ExperimentOutlined />}
                loading={analyzingId === previewItem.id}
                onClick={() => handleAnalyze(previewItem)}
              >
                {isAnalyzed(previewItem) ? '重新分析' : 'AI 分析'}
              </Button>
            )}
            {previewItem && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(previewItem)}
              >
                下载素材
              </Button>
            )}
          </Space>
        }
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewMediaError(false);
        }}
        width={720}
        destroyOnClose
      >
        <div style={{ padding: 'var(--spacing-md)' }}>
          {previewMediaError ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Empty
                description="媒体加载失败，请检查地址或重新上传"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : previewItem?.type === 'image' && previewItem.url ? (
            <img
              src={previewItem.url}
              alt={previewItem.name}
              onError={() => setPreviewMediaError(true)}
              style={{ width: '100%', borderRadius: 8, maxHeight: 480, objectFit: 'contain' }}
            />
          ) : previewItem?.type === 'video' && previewItem.url ? (
            <video
              src={previewItem.url}
              controls
              onError={() => setPreviewMediaError(true)}
              style={{ width: '100%', borderRadius: 8, maxHeight: 480 }}
            />
          ) : previewItem?.type === 'audio' && previewItem.url ? (
            <audio
              src={previewItem.url}
              controls
              onError={() => setPreviewMediaError(true)}
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Empty description="暂无预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}

          {/* 元信息 */}
          <div
            style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 24, flexWrap: 'wrap' }}
          >
            {previewItem && (
              <>
                <div>
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, display: 'block' }}>
                    类型
                  </Text>
                  <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                    {typeConfig[previewItem.type]?.label}
                  </Text>
                </div>
                <div>
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, display: 'block' }}>
                    大小
                  </Text>
                  <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                    {formatSize(previewItem.size)}
                  </Text>
                </div>
                <div>
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, display: 'block' }}>
                    上传时间
                  </Text>
                  <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                    {formatDate(previewItem.createdAt)}
                  </Text>
                </div>
                {previewItem.tags && previewItem.tags.length > 0 && (
                  <div>
                    <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, display: 'block' }}>
                      标签
                    </Text>
                    <Space size={4} style={{ marginTop: 2 }}>
                      {previewItem.tags.map((t, i) => (
                        <Tag key={i} style={{ borderRadius: 12, fontSize: 11 }}>
                          {t}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI 三层标签 */}
          {(previewItem?.productTags || previewItem?.videoTags || previewItem?.clipTags) && (
            <div
              style={{
                marginTop: 'var(--spacing-lg)',
                padding: 'var(--spacing-lg)',
                background: 'var(--bg-surface-2)',
                borderRadius: 12,
                border: '1px solid var(--border-color)',
              }}
            >
              <Space style={{ marginBottom: 12 }}>
                <ExperimentOutlined style={{ color: 'var(--brand-primary)' }} />
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  AI 智能分析标签
                </Text>
                {(previewItem?.metadata as any)?.analyzedAt && (
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                    分析时间: {formatDate((previewItem.metadata as any).analyzedAt)}
                  </Text>
                )}
              </Space>

              {previewItem?.productTags && (
                <div
                  style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}
                >
                  <Tag color="blue" style={{ borderRadius: 12, flexShrink: 0, margin: 0 }}>
                    商品标签
                  </Tag>
                  <Text
                    style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: '22px' }}
                  >
                    {Object.entries(previewItem.productTags)
                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
                      .join(' · ')}
                  </Text>
                </div>
              )}
              {previewItem?.videoTags && (
                <div
                  style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}
                >
                  <Tag color="purple" style={{ borderRadius: 12, flexShrink: 0, margin: 0 }}>
                    画面标签
                  </Tag>
                  <Text
                    style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: '22px' }}
                  >
                    {Object.entries(previewItem.videoTags)
                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
                      .join(' · ')}
                  </Text>
                </div>
              )}
              {previewItem?.clipTags && (
                <div
                  style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}
                >
                  <Tag color="cyan" style={{ borderRadius: 12, flexShrink: 0, margin: 0 }}>
                    剪辑标签
                  </Tag>
                  <Text
                    style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: '22px' }}
                  >
                    {Object.entries(previewItem.clipTags)
                      .filter(
                        ([, v]) =>
                          v !== null && v !== undefined && (typeof v === 'string' ? v !== '' : true)
                      )
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
                      .join(' · ')}
                  </Text>
                </div>
              )}
              {(previewItem?.metadata as any)?.caption && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Tag color="gold" style={{ borderRadius: 12, flexShrink: 0, margin: 0 }}>
                    画面描述
                  </Tag>
                  <Text
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      lineHeight: '22px',
                      fontStyle: 'italic',
                    }}
                  >
                    "{(previewItem?.metadata as any).caption}"
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* hover/card 样式 */}
      <style>{`
        .material-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important;
        }
        .upload-dragger-hover:hover {
          border-color: var(--brand-primary) !important;
          background: rgba(99,102,241,0.04) !important;
        }
      `}</style>
    </div>
  );
}

export default MaterialPage;
