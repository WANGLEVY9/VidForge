import { useState, useRef, useEffect } from 'react';
import { useShell } from '../../components/layout/shell-context';
import {
  Button, Input, Form, Select, Slider, Switch, Space, Typography,
  Tag, Divider, message, Row, Col, Steps, Tooltip, Spin, Alert,
} from 'antd';
import {
  RocketOutlined, BulbOutlined, CopyOutlined, SaveOutlined,
  FileTextOutlined, ThunderboltOutlined,
  ExperimentOutlined, CustomerServiceOutlined, ShoppingCartOutlined,
  VideoCameraOutlined, SoundOutlined, AimOutlined,
} from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { useAutosave, getDraft, clearDraft } from '../../hooks/useAutosave';
import { scriptApi } from '../../services/script';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ScriptStyle =
  | 'professional'
  | 'realistic'
  | 'fresh'
  | 'dynamic'
  | 'luxury';

const styleOptions: { value: ScriptStyle; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'professional', label: '专业评测', icon: <ExperimentOutlined />, desc: '客观分析产品优缺点' },
  { value: 'realistic',    label: '真实纪录', icon: <BulbOutlined />,        desc: '生活化场景的自然演绎' },
  { value: 'fresh',        label: '清新简约', icon: <CustomerServiceOutlined />, desc: '清爽柔和的视觉风格' },
  { value: 'dynamic',      label: '动感活力', icon: <VideoCameraOutlined />, desc: '快剪奏感强的种草' },
  { value: 'luxury',       label: '奢华高级', icon: <ShoppingCartOutlined />, desc: '高质感商品大片' },
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

interface ShotItem {
  index: number;
  duration: number;
  description: string;
  voiceover: string;
  caption: string;
  cameraMovement?: string;
  type?: string;
}

interface ScriptResult {
  title: string;
  duration: number;
  totalDuration: string;
  shots: ShotItem[];
  voiceover: string;
  bgmSuggestion: string;
  tags: string[];
  source?: 'ark' | 'fallback';
}

function ScriptPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>('professional');
  const [duration, setDuration] = useState<number>(15);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const DRAFT_KEY = 'script_config';
  const draftRestored = useRef(false);

  useEffect(() => {
    if (draftRestored.current) return;
    const draft = getDraft<{ productName?: string; category?: string; sellingPoints?: string; targetAudience?: string[] }>(DRAFT_KEY);
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
      const data = await scriptApi.generate({
        productName: values.productName,
        category: values.category,
        sellingPoints: values.sellingPoints,
        targetAudience: audience,
        style: scriptStyle,
        duration,
      }) as ScriptResult;
      setResult(data);
      if (data?.source === 'fallback') {
        message.warning('AI 模型暂不可用，已为你生成示例剧本');
      } else {
        message.success('剧本生成成功');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '剧本生成失败';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制到剪贴板'));
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
        targetAudience: Array.isArray(values.targetAudience) ? values.targetAudience.join('、') : values.targetAudience,
        style: scriptStyle,
        storyboard: result.shots as any,
        voiceover: result.voiceover,
        bgmSuggestion: result.bgmSuggestion,
        tags: result.tags,
        duration: result.duration,
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
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-xl)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
              >
                <Text strong style={{ color: 'var(--text-primary)' }}>剧本配置</Text>
                <Text style={{ color: 'var(--brand-primary)', fontSize: 13 }}>{configExpanded ? '收起' : '展开'}</Text>
              </div>
            )}
            {configExpanded && (
            <div style={{ padding: 'var(--spacing-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-xl)' }}>
                <ThunderboltOutlined style={{ color: 'var(--brand-primary)', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>剧本配置</Text>
              </div>
              <Form
                form={form}
                layout="vertical"
                size="large"
                onValuesChange={(_, all) => setFormValues(all)}
              >
                <Form.Item
                  name="productName"
                  label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>商品名称</Text>}
                  rules={[{ required: true, message: '请输入商品名称' }]}
                >
                  <Input placeholder="例如：清爽防晒霜 SPF50+" style={{ borderRadius: 'var(--radius-md)' }} />
                </Form.Item>

                <Form.Item
                  name="category"
                  label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>商品品类</Text>}
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
                  label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>核心卖点</Text>}
                  rules={[{ required: true, message: '请输入至少一个卖点' }]}
                  extra={<Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>多个卖点用逗号分隔</Text>}
                >
                  <TextArea
                    placeholder="例如：轻薄不油腻, 3秒成膜, 不假白, 防水防汗"
                    rows={3}
                    style={{ borderRadius: 'var(--radius-md)' }}
                  />
                </Form.Item>

                <Form.Item
                  name="targetAudience"
                  label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>目标人群</Text>}
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

                <Divider style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />

                <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频风格</Text>}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(5, 120px)' : '1fr 1fr', gap: 8, overflowX: isMobile ? 'auto' : 'visible' }}>
                    {styleOptions.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => setScriptStyle(opt.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${scriptStyle === opt.value ? '#6366f1' : 'var(--border-color)'}`,
                          background: scriptStyle === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Space>
                          <span style={{ color: scriptStyle === opt.value ? '#6366f1' : 'var(--text-secondary)' }}>{opt.icon}</span>
                          <Text style={{ fontSize: 13, color: scriptStyle === opt.value ? '#6366f1' : 'var(--text-primary)' }}>{opt.label}</Text>
                        </Space>
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {opt.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频时长（秒）</Text>}>
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

                <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>附加选项</Text>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'var(--text-primary)' }}>自动添加字幕</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'var(--text-primary)' }}>推荐 BGM</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'var(--text-primary)' }}>生成配音脚本</Text>
                      <Switch defaultChecked />
                    </div>
                  </Space>
                </Form.Item>

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
              <Title level={4} style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>等待创作</Title>
              <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
                填写左侧商品信息，AI 将基于火山方舟模型生成专业带货剧本，包含分镜脚本、配音文案和 BGM 推荐
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
                    <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{result.title}</Text>
                    <Tag color="blue">⏱ {result.totalDuration}</Tag>
                    {result.source === 'fallback' && <Tag color="orange">兜底剧本</Tag>}
                    {result.source === 'ark' && <Tag color="cyan">AI 生成</Tag>}
                  </Space>
                }
                style={{ borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-lg)', padding: '12px 16px' }}
              />

              {/* 分镜脚本 */}
              <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <Space>
                    <VideoCameraOutlined style={{ color: 'var(--brand-primary)' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>分镜脚本（{result.shots.length}）</Text>
                  </Space>
                  <Space>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() =>
                        handleCopy(
                          result.shots
                            .map(
                              (s) =>
                                `[${s.index}] ${s.description}\n口播：${s.voiceover}\n字幕：${s.caption}`,
                            )
                            .join('\n\n'),
                        )
                      }
                    >
                      复制全部
                    </Button>
                    <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>保存剧本</Button>
                  </Space>
                </div>
                {result.shots.map((shot) => (
                  <div
                    key={shot.index}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: 'var(--spacing-md) var(--spacing-xl)',
                      borderBottom: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${shotTypeColors[shot.type ?? 'demo']}`,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
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
                          {shot.description}
                        </Text>
                      </div>
                      {shot.voiceover && (
                        <div style={{ marginTop: 6 }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            🎙 {shot.voiceover}
                          </Text>
                        </div>
                      )}
                      {shot.caption && (
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                            💬 {shot.caption}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Tooltip title="复制本分镜">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          handleCopy(
                            `[${shot.index}] ${shot.description}\n口播：${shot.voiceover}\n字幕：${shot.caption}`,
                          )
                        }
                      />
                    </Tooltip>
                  </div>
                ))}
              </GlassPanel>

              {/* 配音建议 */}
              {result.voiceover && (
                <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <SoundOutlined style={{ color: '#ec4899' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>配音建议</Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>{result.voiceover}</Paragraph>
                  </div>
                </GlassPanel>
              )}

              {/* BGM 推荐 */}
              {result.bgmSuggestion && (
                <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <CustomerServiceOutlined style={{ color: '#10b981' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>BGM 推荐</Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>{result.bgmSuggestion}</Paragraph>
                  </div>
                </GlassPanel>
              )}

              {/* 标签 */}
              {result.tags && result.tags.length > 0 && (
                <GlassPanel variant="card">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <AimOutlined style={{ color: '#f59e0b' }} />
                    <Text strong style={{ color: 'var(--text-primary)' }}>推荐标签</Text>
                  </div>
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Space size={8} wrap>
                      {result.tags.map((tag, i) => (
                        <Tag key={i} color="blue" style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>#{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                </GlassPanel>
              )}
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default ScriptPage;
