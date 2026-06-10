import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShell } from '../../components/layout/shell-context';
import {
  Button,
  Input,
  Form,
  Select,
  Slider,
  Space,
  Typography,
  Tag,
  Divider,
  message,
  Row,
  Col,
  Steps,
  Tooltip,
  Spin,
  Alert,
  Modal,
  Drawer,
  Card,
} from 'antd';
import {
  RocketOutlined,
  BulbOutlined,
  CopyOutlined,
  SaveOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  CustomerServiceOutlined,
  ShoppingCartOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  AimOutlined,
  ApiOutlined,
  ArrowRightOutlined,
  FireOutlined,
  EditOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { useAutosave, getDraft, clearDraft } from '../../hooks/useAutosave';
import { scriptApi, ScriptResult, InspireSeed } from '../../services/script';
import { aiApi } from '../../services/ai';
import { useScriptHandoffStore } from '../../store/useScriptHandoffStore';
import { RagReferenceCard } from '../../components/script/RagReferenceCard';
import { ComplianceCard } from '../../components/script/ComplianceCard';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ScriptStyle = 'professional' | 'realistic' | 'fresh' | 'dynamic' | 'luxury';

const styleOptions: { value: ScriptStyle; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'professional',
    label: '专业评测',
    icon: <ExperimentOutlined />,
    desc: '客观分析产品优缺点',
  },
  { value: 'realistic', label: '真实纪录', icon: <BulbOutlined />, desc: '生活化场景的自然演绎' },
  {
    value: 'fresh',
    label: '清新简约',
    icon: <CustomerServiceOutlined />,
    desc: '清爽柔和的视觉风格',
  },
  { value: 'dynamic', label: '动感活力', icon: <VideoCameraOutlined />, desc: '快剪奏感强的种草' },
  { value: 'luxury', label: '奢华高级', icon: <ShoppingCartOutlined />, desc: '高质感商品大片' },
];

const shotTypeColors: Record<string, string> = {
  hook: '#ef4444',
  intro: '#3b82f6',
  demo: '#10b981',
  proof: '#f59e0b',
  feature: '#8b5cf6',
  cta: '#ec4899',
};
const shotTypeLabels: Record<string, string> = {
  hook: '黄金开头',
  intro: '产品引入',
  demo: '效果展示',
  proof: '实测证明',
  feature: '卖点总结',
  cta: '行动号召',
};

// 注:剧本结果 / 分镜 类型从 services/script 导入,本页不再重复定义

function SortableShot({
  shot,
  shotTypeColors,
  shotTypeLabels,
  editingCell,
  onEditCell,
  onCellChange,
  onCopy,
  onRegenerate,
  regenerating,
}: {
  shot: ScriptResult['shots'][0];
  shotTypeColors: Record<string, string>;
  shotTypeLabels: Record<string, string>;
  editingCell: { index: number; field: string } | null;
  onEditCell: (index: number, field: string) => void;
  onCellChange: (index: number, field: string, value: string) => void;
  onCopy: (text: string) => void;
  onRegenerate: (index: number) => void;
  regenerating: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shot.index,
  });
  const style: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: 'var(--spacing-md) var(--spacing-xl)',
    borderBottom: '1px solid var(--border-color)',
    borderLeft: `3px solid ${shotTypeColors[shot.type ?? 'demo']}`,
    transition: transition || 'background 0.2s',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    background: 'transparent',
  };
  const isEditing = (field: string) =>
    editingCell?.index === shot.index && editingCell?.field === field;

  const editableField = (field: keyof typeof shot, value: string | undefined) => {
    if (isEditing(field as string)) {
      return (
        <Input
          size="small"
          value={value || ''}
          onChange={(e) => onCellChange(shot.index, field as string, e.target.value)}
          onBlur={() => onEditCell(shot.index, field as string)}
          onPressEnter={() => onEditCell(shot.index, field as string)}
          autoFocus
          style={{ width: '100%', borderRadius: 4 }}
        />
      );
    }
    return (
      <span
        onClick={() => onEditCell(shot.index, field as string)}
        style={{
          cursor: 'pointer',
          borderBottom: '1px dashed var(--border-color)',
          padding: '0 2px',
        }}
        title="点击编辑"
      >
        {value || <Text type="secondary">(空)</Text>}
      </span>
    );
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ width: 84, flexShrink: 0 }}>
        <Tag color={shotTypeColors[shot.type ?? 'demo']} style={{ borderRadius: 20, fontSize: 11 }}>
          {shotTypeLabels[shot.type ?? 'demo'] ?? shot.type ?? '分镜'}
        </Tag>
        <div style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            #{shot.index} · {shot.duration}s
          </Text>
        </div>
        {shot.cameraMovement && (
          <div style={{ marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {shot.cameraMovement}
            </Text>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>
          <Text style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6 }}>
            {editableField('description', shot.description)}
          </Text>
        </div>
        {shot.voiceover !== undefined && (
          <div style={{ marginTop: 6 }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              🎙 {editableField('voiceover', shot.voiceover)}
            </Text>
          </div>
        )}
        {shot.caption !== undefined && (
          <div style={{ marginTop: 4 }}>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              💬 {editableField('caption', shot.caption)}
            </Text>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <Tooltip title="复制本分镜">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() =>
              onCopy(
                `[${shot.index}] ${shot.description}\n口播：${shot.voiceover}\n字幕：${shot.caption}`
              )
            }
          />
        </Tooltip>
        <Tooltip title="重新生成此分镜">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            loading={regenerating}
            onClick={() => onRegenerate(shot.index)}
          />
        </Tooltip>
      </div>
    </div>
  );
}

function ScriptPage() {
  const { spaceId } = useParams<{ spaceId?: string }>();
  const navigate = useNavigate();
  const setPendingHandoff = useScriptHandoffStore((s) => s.setPending);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ── 分镜编辑状态 ─────────────────────────────────────
  const [editingShots, setEditingShots] = useState<ScriptResult['shots']>([]);
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  const [savingShots, setSavingShots] = useState(false);
  const [regeneratingShot, setRegeneratingShot] = useState<number | null>(null);
  const [regenerateResultId, setRegenerateResultId] = useState<string | null>(null);

  // 当 result 变化时同步 editingShots
  useEffect(() => {
    if (result) {
      setEditingShots(result.shots.map((s) => ({ ...s })));
    }
  }, [result]);

  // ── @dnd-kit 传感器 ───────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditingShots((prev) => {
      const oldIndex = prev.findIndex((s) => s.index === Number(active.id));
      const newIndex = prev.findIndex((s) => s.index === Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      // 重编号
      return reordered.map((s, i) => ({ ...s, index: i + 1 }));
    });
  }, []);

  const handleEditCell = (index: number, field: string) => {
    setEditingCell(
      editingCell?.index === index && editingCell?.field === field ? null : { index, field }
    );
  };

  const handleCellChange = (index: number, field: string, value: string) => {
    setEditingShots((prev) => prev.map((s) => (s.index === index ? { ...s, [field]: value } : s)));
  };

  const handleRegenerateShot = async (index: number) => {
    if (!result) return;
    setRegeneratingShot(index);
    // 需要保存后的 script id；取 handoff store 或固定 ID
    const scriptId = regenerateResultId || 'current';
    try {
      const data = await scriptApi.regenerateShot(scriptId, index);
      setEditingShots((prev) =>
        prev.map((s) => (s.index === index ? { ...s, ...data, _regenerated: true } : s))
      );
      message.success('分镜已重新生成');
    } catch (err: any) {
      message.error(err?.message || '重生成失败');
    } finally {
      setRegeneratingShot(null);
    }
  };

  const handleSaveShots = async () => {
    if (!result) return;
    setSavingShots(true);
    try {
      // 先保存剧本本体
      const values = form.getFieldsValue();
      const saved = await scriptApi.save({
        title: result.title,
        productName: values.productName,
        category: values.category,
        sellingPoints: values.sellingPoints,
        targetAudience: Array.isArray(values.targetAudience)
          ? values.targetAudience.join('、')
          : values.targetAudience,
        style: scriptStyle,
        storyboard: editingShots as any,
        voiceover: result.voiceover,
        bgmSuggestion: result.bgmSuggestion,
        tags: result.tags,
        duration: result.duration,
        productSpaceId: spaceId,
      });
      setRegenerateResultId(saved.id);
      message.success('分镜已保存');
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    } finally {
      setSavingShots(false);
    }
  };
  const [diagnosing, setDiagnosing] = useState(false);
  const [inspireOpen, setInspireOpen] = useState(false);
  const [inspireData, setInspireData] = useState<InspireSeed[]>([]);
  const [inspireLoading, setInspireLoading] = useState(false);
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>('professional');
  const [duration, setDuration] = useState<number>(15);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const DRAFT_KEY = 'script_config';
  const draftRestored = useRef(false);

  useEffect(() => {
    if (draftRestored.current) return;
    const draft = getDraft<{
      productName?: string;
      category?: string;
      sellingPoints?: string;
      targetAudience?: string[];
    }>(DRAFT_KEY);
    if (draft && draft.productName) {
      form.setFieldsValue(draft);
      setFormValues(draft);
      message.info('已恢复上次的剧本配置');
    }
    draftRestored.current = true;
  }, [form]);

  useAutosave({
    key: DRAFT_KEY,
    data: formValues,
    enabled: !result,
  });

  useEffect(() => {
    if (result) clearDraft(DRAFT_KEY);
  }, [result]);

  const { isMobile } = useShell();
  const [configExpanded, setConfigExpanded] = useState(!isMobile);

  const handleGenerate = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const audience = Array.isArray(values.targetAudience)
        ? values.targetAudience.join('、')
        : values.targetAudience;
      const data = (await scriptApi.generate({
        productName: values.productName,
        category: values.category,
        sellingPoints: values.sellingPoints,
        targetAudience: audience,
        style: scriptStyle,
        duration,
        productSpaceId: spaceId,
      })) as ScriptResult;
      setResult(data);
      if (data?.source === 'fallback') {
        const reason = (data as any)?.fallbackReason || '原因未知';
        Modal.warning({
          title: 'AI 模型未生效，已为你生成示例剧本',
          width: 520,
          content: (
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                后端没有真正调到火山方舟模型，本次用的是示例兜底数据。
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text type="secondary">原因：</Text>
                <Text code copyable style={{ wordBreak: 'break-all' }}>
                  {String(reason)}
                </Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                可点击页面右上角「诊断 AI 模型」按钮查看详细自检结果， 或检查 Railway
                后端是否正确配置了
                <Text code>ARK_TEXT_PRIMARY_ENDPOINT_ID</Text>/
                <Text code>ARK_TEXT_PRIMARY_API_KEY</Text>。
              </Paragraph>
            </div>
          ),
        });
      } else {
        message.success('剧本生成成功');
      }
    } catch (err: any) {
      const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message ?? '');
      const msg = isTimeout
        ? 'AI 创作耗时较长（已超过 150 秒），请稍后重试或简化卖点描述'
        : err?.response?.data?.message || err?.message || '剧本生成失败';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspire = async () => {
    setInspireOpen(true);
    setInspireLoading(true);
    try {
      const values = form.getFieldsValue();
      const data = await scriptApi.inspire(values.category, scriptStyle);
      setInspireData(data ?? []);
    } catch (err: any) {
      message.error(`加载爆款参考失败:${err?.message ?? ''}`);
      setInspireData([]);
    } finally {
      setInspireLoading(false);
    }
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    try {
      const result = await aiApi.diagnose();
      if (result.ok) {
        Modal.success({
          title: 'ARK 文本模型可用',
          width: 480,
          content: (
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                后端已成功调通火山方舟，剧本生成会真实驱动大模型。
              </Paragraph>
              <Paragraph style={{ marginBottom: 4 }}>
                <Text type="secondary">Endpoint：</Text>
                <Text code>{result.endpointId}</Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: 4 }}>
                <Text type="secondary">耗时：</Text>
                <Text>{result.durationMs} ms</Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <Text type="secondary">样例返回：</Text>
                <Text code copyable>
                  {result.sample}
                </Text>
              </Paragraph>
            </div>
          ),
        });
      } else {
        Modal.error({
          title: 'ARK 文本模型不可用',
          width: 560,
          content: (
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text type="secondary">阶段：</Text>
                <Text code>{result.stage}</Text>
                {result.stage === 'config'
                  ? '（后端未配置环境变量）'
                  : '（环境变量已配置，但调用真实失败）'}
              </Paragraph>
              {result.endpointId && (
                <Paragraph style={{ marginBottom: 4 }}>
                  <Text type="secondary">Endpoint：</Text>
                  <Text code>{result.endpointId}</Text>
                </Paragraph>
              )}
              {result.endpointFingerprint && (
                <Paragraph style={{ marginBottom: 4 }}>
                  <Text type="secondary">Endpoint 指纹：</Text>
                  <Text code>
                    len={result.endpointFingerprint.length} {result.endpointFingerprint.masked}
                  </Text>
                  {result.endpointFingerprint.issues.length > 0 && (
                    <Text type="danger" style={{ marginLeft: 8 }}>
                      ⚠ {result.endpointFingerprint.issues.join(', ')}
                    </Text>
                  )}
                </Paragraph>
              )}
              {result.apiKeyFingerprint && (
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text type="secondary">API Key 指纹：</Text>
                  <Text code>
                    len={result.apiKeyFingerprint.length} {result.apiKeyFingerprint.masked}
                  </Text>
                  {result.apiKeyFingerprint.issues.length > 0 && (
                    <Text type="danger" style={{ marginLeft: 8 }}>
                      ⚠ {result.apiKeyFingerprint.issues.join(', ')}
                    </Text>
                  )}
                </Paragraph>
              )}
              <Paragraph style={{ marginBottom: 8 }}>
                <Text type="secondary">原因：</Text>
                <Text code copyable style={{ wordBreak: 'break-all' }}>
                  {result.reason}
                </Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                若错误是「API key doesn't exist」，多为以下情况：
                <br />
                1. API Key 已被吊销/重置 → 去火山方舟控制台重新生成
                <br />
                2. 黏贴时混入空格/换行/引号 → 看上方指纹是否有 ⚠
                <br />
                3. Key 与 Endpoint 不在同一火山账号下
              </Paragraph>
            </div>
          ),
        });
      }
    } catch (err: any) {
      message.error(err?.message ?? '诊断接口请求失败');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制到剪贴板'));
  };

  /**
   * 把当前剧本写入 handoff store,跳转到视频生成页 — 视频页 mount 时
   * 会消费 store 中的剧本,自动初始化 storyboard,免去用户重新输入主题
   * 再次调用 LLM 生成。
   */
  const handleGoToVideo = () => {
    if (!result) return;
    const values = form.getFieldsValue();
    const prompt =
      values.productName ?? result.title ?? result.shots?.[0]?.description ?? '带货短视频';
    setPendingHandoff(result, String(prompt), spaceId);
    if (spaceId) {
      navigate(`/workspace/${spaceId}/video`);
    } else {
      navigate('/creation');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const values = form.getFieldsValue();
    try {
      await scriptApi.save({
        title: result.title,
        productName: values.productName,
        category: values.category,
        sellingPoints: values.sellingPoints,
        targetAudience: Array.isArray(values.targetAudience)
          ? values.targetAudience.join('、')
          : values.targetAudience,
        style: scriptStyle,
        storyboard: result.shots as any,
        voiceover: result.voiceover,
        bgmSuggestion: result.bgmSuggestion,
        tags: result.tags,
        duration: result.duration,
        productSpaceId: spaceId,
      });
      message.success('剧本已保存');
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    }
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      <Row gutter={24}>
        {/* 左侧：输入面板 */}
        <Col xs={24} lg={10}>
          <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {isMobile && (
              <div
                onClick={() => setConfigExpanded(!configExpanded)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <Text strong style={{ color: 'var(--text-primary)' }}>
                  剧本配置
                </Text>
                <Text style={{ color: 'var(--brand-primary)', fontSize: 13 }}>
                  {configExpanded ? '收起' : '展开'}
                </Text>
              </div>
            )}
            {configExpanded && (
              <div style={{ padding: 'var(--spacing-xl)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 'var(--spacing-xl)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThunderboltOutlined style={{ color: 'var(--brand-primary)', fontSize: 18 }} />
                    <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                      剧本配置
                    </Text>
                  </div>
                  <Tooltip title="查看同品类爆款参考视频脚本">
                    <Button size="small" icon={<FireOutlined />} onClick={handleOpenInspire}>
                      爆款参考
                    </Button>
                  </Tooltip>
                  <Tooltip title="一键自检后端 ARK 文本模型是否可用">
                    <Button
                      size="small"
                      icon={<ApiOutlined />}
                      loading={diagnosing}
                      onClick={handleDiagnose}
                    >
                      诊断 AI 模型
                    </Button>
                  </Tooltip>
                </div>
                <Form
                  form={form}
                  layout="vertical"
                  size="large"
                  onValuesChange={(_, all) => setFormValues(all)}
                >
                  <Form.Item
                    name="productName"
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        商品名称
                      </Text>
                    }
                    rules={[{ required: true, message: '请输入商品名称' }]}
                  >
                    <Input
                      placeholder="例如：清爽防晒霜 SPF50+"
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="category"
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        商品品类
                      </Text>
                    }
                    rules={[{ required: true, message: '请选择品类' }]}
                  >
                    <Select
                      placeholder="选择品类"
                      style={{ borderRadius: 'var(--radius-md)' }}
                      options={[
                        { value: 'clothing', label: '服饰鞋包' },
                        { value: 'beauty', label: '美妆护肤' },
                        { value: 'digital', label: '数码 3C' },
                        { value: 'food', label: '食品饮料' },
                        { value: 'home', label: '家居生活' },
                        { value: 'mother', label: '母婴用品' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name="sellingPoints"
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        核心卖点
                      </Text>
                    }
                    rules={[{ required: true, message: '请输入至少一个卖点' }]}
                    extra={
                      <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                        多个卖点用逗号分隔
                      </Text>
                    }
                  >
                    <TextArea
                      placeholder="例如：轻薄不油腻, 3秒成膜, 不假白, 防水防汗"
                      rows={3}
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="targetAudience"
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        目标人群
                      </Text>
                    }
                  >
                    <Select
                      mode="tags"
                      placeholder="输入或选择目标人群"
                      style={{ borderRadius: 'var(--radius-md)' }}
                      options={[
                        { value: '年轻女性', label: '年轻女性' },
                        { value: '学生党', label: '学生党' },
                        { value: '宝妈', label: '宝妈' },
                        { value: '上班族', label: '上班族' },
                        { value: '健身人群', label: '健身人群' },
                      ]}
                    />
                  </Form.Item>

                  <Divider
                    style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }}
                  />

                  <Form.Item
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        视频风格
                      </Text>
                    }
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(5, 120px)' : '1fr 1fr',
                        gap: 8,
                        overflowX: isMobile ? 'auto' : 'visible',
                      }}
                    >
                      {styleOptions.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => setScriptStyle(opt.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${scriptStyle === opt.value ? '#6366f1' : 'var(--border-color)'}`,
                            background:
                              scriptStyle === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Space>
                            <span
                              style={{
                                color:
                                  scriptStyle === opt.value ? '#6366f1' : 'var(--text-secondary)',
                              }}
                            >
                              {opt.icon}
                            </span>
                            <Text
                              style={{
                                fontSize: 13,
                                color:
                                  scriptStyle === opt.value ? '#6366f1' : 'var(--text-primary)',
                              }}
                            >
                              {opt.label}
                            </Text>
                          </Space>
                          <div
                            style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}
                          >
                            {opt.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Form.Item>

                  <Form.Item
                    label={
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        视频时长（秒）
                      </Text>
                    }
                  >
                    <Slider
                      min={10}
                      max={30}
                      step={5}
                      marks={{ 10: '10s', 15: '15s', 20: '20s', 25: '25s', 30: '30s' }}
                      value={duration}
                      onChange={(v) => setDuration(v as number)}
                      tooltip={{ formatter: (v) => `${v}秒` }}
                    />
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      系统将生成 3 个分镜，平均分配时长。当前阶段单条视频建议 ≤ 30 秒。
                    </Text>
                  </Form.Item>

                  {/* 附加选项 — 功能待实现，暂时隐藏 */}

                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<RocketOutlined />}
                    loading={loading}
                    onClick={handleGenerate}
                    block
                    size="large"
                    style={{ borderRadius: 'var(--radius-md)', height: 48, fontSize: 16 }}
                  >
                    {loading ? 'AI 创作中...' : '生成剧本'}
                  </Button>
                </Form>
              </div>
            )}
          </GlassPanel>
        </Col>

        {/* 右侧：结果面板 */}
        <Col xs={24} lg={14}>
          {error && !loading && (
            <Alert
              type="error"
              showIcon
              message="生成失败"
              description={error}
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}
            />
          )}

          {loading && (
            <GlassPanel variant="card" style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: 'var(--text-tertiary)' }}>AI 正在创作剧本，请稍候...</Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: 'var(--text-quaternary, #888)', fontSize: 12 }}>
                  通常耗时 30-90 秒，复杂卖点最长可达 2 分钟
                </Text>
              </div>
              <Steps
                current={1}
                size="small"
                style={{ maxWidth: 400, margin: '24px auto 0' }}
                items={[
                  { title: '分析商品' },
                  { title: '生成大纲' },
                  { title: '撰写文案' },
                  { title: '优化润色' },
                ]}
              />
            </GlassPanel>
          )}

          {!loading && !result && !error && (
            <GlassPanel variant="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 64, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                <FileTextOutlined />
              </div>
              <Title level={4} style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                等待创作
              </Title>
              <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
                填写左侧商品信息，AI 将基于火山方舟模型生成专业带货剧本，包含分镜脚本、配音文案和
                BGM 推荐
              </Paragraph>
            </GlassPanel>
          )}

          {!loading && result && (
            <>
              {/* 剧本标题 */}
              <Alert
                type={result.source === 'fallback' ? 'warning' : 'success'}
                showIcon
                icon={<BulbOutlined />}
                message={
                  <Space wrap>
                    <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                      {result.title}
                    </Text>
                    <Tag color="blue">⏱ {result.totalDuration}</Tag>
                    {result.source === 'fallback' && <Tag color="orange">兜底剧本</Tag>}
                    {result.source === 'ark' && <Tag color="cyan">AI 生成</Tag>}
                  </Space>
                }
                style={{
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--spacing-lg)',
                  padding: '12px 16px',
                }}
              />

              {/* CTA: 一键流转到视频生成 */}
              <GlassPanel
                variant="card"
                style={{
                  marginBottom: 'var(--spacing-lg)',
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  background:
                    result.source === 'fallback'
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(168,85,247,0.05))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} md={16}>
                    <Space align="start" size={12}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-md)',
                          background:
                            'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        <ThunderboltOutlined />
                      </div>
                      <div>
                        <Text
                          strong
                          style={{ color: 'var(--text-primary)', fontSize: 15, display: 'block' }}
                        >
                          剧本已就绪 · 一键合成视频
                        </Text>
                        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {result.source === 'fallback'
                            ? '当前为兜底剧本,合成质量有限。检查 ARK 配置后建议重新生成'
                            : `共 ${result.shots.length} 个分镜,可直接带入视频生成页开始 AI 视频合成`}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                    <Space wrap>
                      <Button icon={<SaveOutlined />} onClick={handleSave} size="large">
                        保存剧本
                      </Button>
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        size="large"
                        onClick={handleGoToVideo}
                        style={{ height: 44 }}
                      >
                        前往视频生成
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </GlassPanel>

              {/* RAG 爆款参考(V2 差异化能力可视化) */}
              <RagReferenceCard references={result.ragReferences} source={result.source} />

              {/* 合规审核结果 */}
              <ComplianceCard report={result.compliance} />

              {/* 分镜脚本 */}
              <GlassPanel
                variant="card"
                style={{ marginBottom: 'var(--spacing-lg)', overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <Space>
                    <VideoCameraOutlined style={{ color: 'var(--brand-primary)' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      分镜脚本（{editingShots.length}）
                    </Text>
                    <Tag style={{ borderRadius: 10, fontSize: 10 }}>
                      拖拽可排序 · 点击文字可编辑
                    </Tag>
                  </Space>
                  <Space>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() =>
                        handleCopy(
                          editingShots
                            .map(
                              (s) =>
                                `[${s.index}] ${s.description}\n口播：${s.voiceover}\n字幕：${s.caption}`
                            )
                            .join('\n\n')
                        )
                      }
                    >
                      复制全部
                    </Button>
                    <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>
                      保存剧本
                    </Button>
                  </Space>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editingShots.map((s) => s.index)}
                    strategy={verticalListSortingStrategy}
                  >
                    {editingShots.map((shot) => (
                      <SortableShot
                        key={shot.index}
                        shot={shot}
                        shotTypeColors={shotTypeColors}
                        shotTypeLabels={shotTypeLabels}
                        editingCell={editingCell}
                        onEditCell={handleEditCell}
                        onCellChange={handleCellChange}
                        onCopy={handleCopy}
                        onRegenerate={handleRegenerateShot}
                        regenerating={regeneratingShot === shot.index}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {editingShots.length > 0 && (
                  <div
                    style={{
                      padding: 'var(--spacing-md) var(--spacing-xl)',
                      borderTop: '1px solid var(--border-color)',
                      textAlign: 'right',
                    }}
                  >
                    <Space>
                      <Button
                        icon={<UndoOutlined />}
                        onClick={() => setEditingShots(result!.shots.map((s) => ({ ...s })))}
                      >
                        重置
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveShots}
                        loading={savingShots}
                      >
                        保存分镜
                      </Button>
                    </Space>
                  </div>
                )}
              </GlassPanel>

              {/* 配音建议 */}
              {result.voiceover && (
                <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 'var(--spacing-lg) var(--spacing-xl)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <SoundOutlined style={{ color: '#ec4899' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      配音建议
                    </Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>
                      {result.voiceover}
                    </Paragraph>
                  </div>
                </GlassPanel>
              )}

              {/* BGM 推荐 */}
              {result.bgmSuggestion && (
                <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 'var(--spacing-lg) var(--spacing-xl)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <CustomerServiceOutlined style={{ color: '#10b981' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      BGM 推荐
                    </Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>
                      {result.bgmSuggestion}
                    </Paragraph>
                  </div>
                </GlassPanel>
              )}

              {/* 标签 */}
              {result.tags && result.tags.length > 0 && (
                <GlassPanel variant="card">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 'var(--spacing-lg) var(--spacing-xl)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <AimOutlined style={{ color: '#f59e0b' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      推荐标签
                    </Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Space size={8} wrap>
                      {result.tags.map((tag, i) => (
                        <Tag
                          key={i}
                          color="blue"
                          style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13 }}
                        >
                          #{tag}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </GlassPanel>
              )}
            </>
          )}
        </Col>
      </Row>

      {/* ─── 爆款参考抽屉 ─── */}
      <Drawer
        title={
          <Space>
            <FireOutlined style={{ color: '#f59e0b' }} />
            <span>爆款参考脚本</span>
            <Tag style={{ borderRadius: 12, fontSize: 11 }}>{inspireData.length} 条</Tag>
          </Space>
        }
        placement="right"
        width={420}
        open={inspireOpen}
        onClose={() => setInspireOpen(false)}
        extra={
          <Button size="small" onClick={handleOpenInspire} loading={inspireLoading}>
            刷新
          </Button>
        }
      >
        {inspireLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
            <div style={{ marginTop: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>
              加载爆款参考...
            </div>
          </div>
        ) : inspireData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                fontSize: 40,
                color: 'var(--text-tertiary)',
                marginBottom: 12,
                opacity: 0.5,
              }}
            >
              <FireOutlined />
            </div>
            <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              暂无匹配的爆款参考
            </Text>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              请先在左侧配置商品品类后重新加载
            </Text>
          </div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {inspireData.map((seed) => (
              <Card
                key={seed.id}
                size="small"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                }}
                bodyStyle={{ padding: 16 }}
              >
                {/* 头部:品类+风格+效果 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Space size={6}>
                    <Tag color="blue" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                      {seed.category}
                    </Tag>
                    <Tag color="cyan" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                      {seed.style}
                    </Tag>
                  </Space>
                  <Tag color="gold" style={{ borderRadius: 10, fontSize: 10 }}>
                    {seed.performance}
                  </Tag>
                </div>

                {/* 分镜概要 */}
                <div style={{ marginBottom: 10 }}>
                  {seed.shots?.hook && (
                    <div
                      style={{
                        marginBottom: 4,
                        padding: '4px 8px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 6,
                        borderLeft: '3px solid #ef4444',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>HOOK </Text>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {seed.shots.hook.voiceover || seed.shots.hook.description}
                        </Text>
                      </div>
                      {seed.shots.hook.description && !seed.shots.hook.voiceover ? null : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            display: 'block',
                            marginTop: 2,
                          }}
                        >
                          {seed.shots.hook.description}
                        </Text>
                      )}
                    </div>
                  )}
                  {seed.shots?.demo && (
                    <div
                      style={{
                        marginBottom: 4,
                        padding: '4px 8px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 6,
                        borderLeft: '3px solid #10b981',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>DEMO </Text>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {seed.shots.demo.voiceover || seed.shots.demo.description}
                        </Text>
                      </div>
                      {seed.shots.demo.description && !seed.shots.demo.voiceover ? null : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            display: 'block',
                            marginTop: 2,
                          }}
                        >
                          {seed.shots.demo.description}
                        </Text>
                      )}
                    </div>
                  )}
                  {seed.shots?.cta && (
                    <div
                      style={{
                        padding: '4px 8px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 6,
                        borderLeft: '3px solid #ec4899',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#ec4899', fontWeight: 600 }}>CTA </Text>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {seed.shots.cta.voiceover || seed.shots.cta.description}
                        </Text>
                      </div>
                      {seed.shots.cta.description && !seed.shots.cta.voiceover ? null : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            display: 'block',
                            marginTop: 2,
                          }}
                        >
                          {seed.shots.cta.description}
                        </Text>
                      )}
                    </div>
                  )}
                </div>

                {/* 关键信息 */}
                {seed.keyMessages && seed.keyMessages.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 2,
                      }}
                    >
                      核心信息
                    </Text>
                    <Space size={4} wrap>
                      {seed.keyMessages.map((msg, i) => (
                        <Tag
                          key={i}
                          style={{ borderRadius: 10, fontSize: 10, margin: 0 }}
                          color="default"
                        >
                          {msg}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* BGM */}
                {seed.bgmStyle && (
                  <div>
                    <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      BGM: {seed.bgmStyle}
                    </Text>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default ScriptPage;
