import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button, Input, Form, Space, Typography, Steps, Progress,
  Tag, Row, Col, Slider, Switch, message,
  Timeline, Segmented, Radio, Badge, Empty, Alert,
} from 'antd';
import {
  PlayCircleOutlined, ReloadOutlined,
  ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  LoadingOutlined, DownloadOutlined, SettingOutlined,
  FileTextOutlined, EditOutlined, RobotOutlined,
} from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { StoryboardEditor } from '../../components/storyboard/StoryboardEditor';
import { useStoryboardStore, Shot } from '../../store/useStoryboardStore';
import { useShell } from '../../components/layout/shell-context';
import { agentApi } from '../../services/agent';
import { creationApi } from '../../services/creation';
import { scriptApi } from '../../services/script';
import { ExportPanel } from './components/ExportPanel';
import { useAutosave, getDraft, clearDraft } from '../../hooks/useAutosave';
import { usePageTiming } from '../../hooks/usePerformance';
import '../../components/storyboard/storyboard.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type CreationStep = 'config' | 'storyboard' | 'generating' | 'complete';

interface StoryboardItem {
  id: string;
  order: number;
  description: string;
  voiceover?: string;
  caption?: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  referenceImage?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

const aspectRatios = [
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '16:9', desc: 'YouTube/B站' },
  { label: '1:1 方形', value: '1:1', desc: '小红书/朋友圈' },
];

const qualityOptions = [
  { label: '标准 720p', value: '720p' },
  { label: '高清 1080p', value: '1080p' },
];

interface LogEntry {
  ts: number;
  level: 'info' | 'success' | 'warn' | 'error';
  text: string;
}

function CreationPage() {
  const [currentStep, setCurrentStep] = useState<CreationStep>('config');
  const [overallProgress, setOverallProgress] = useState(0);
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState('seedance-1.5-pro');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p');
  const [duration, setDuration] = useState<number>(15);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [, setAgentTaskId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const DRAFT_KEY = 'creation_config';
  const draftRestored = useRef(false);
  const wsCleanup = useRef<null | (() => void)>(null);
  usePageTiming('Creation');

  // Restore draft
  useEffect(() => {
    if (draftRestored.current) return;
    const draft = getDraft<{ prompt?: string; model?: string; aspectRatio?: string; quality?: string }>(DRAFT_KEY);
    if (draft && draft.prompt) {
      form.setFieldsValue({ prompt: draft.prompt });
      if (draft.model) setSelectedModel(draft.model);
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio as any);
      if (draft.quality) setQuality(draft.quality as any);
      message.info('已恢复上次的创作配置');
    }
    draftRestored.current = true;
  }, [form]);

  // Autosave
  const formValuesForSave = { prompt: formValues?.prompt, model: selectedModel, aspectRatio, quality };
  useAutosave({
    key: DRAFT_KEY,
    data: formValuesForSave,
    enabled: currentStep === 'config',
  });

  useEffect(() => {
    if (currentStep === 'complete') {
      clearDraft(DRAFT_KEY);
    }
  }, [currentStep]);

  const { isMobile } = useShell();
  const setShots = useStoryboardStore((s) => s.setShots);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);

  // 同步 storyboard 到全局 store（StoryboardEditor 用它渲染）
  useEffect(() => {
    const shots: Shot[] = storyboard.map((m) => ({
      id: m.id,
      order: m.order,
      description: m.description,
      duration: m.duration,
      type: m.type,
      script: m.voiceover ?? '',
      status: m.status,
      videoUrl: m.videoUrl,
      thumbnailUrl: m.thumbnailUrl,
    }));
    setShots(shots);
    if (shots.length > 0) setActiveShot(shots[0].id);
  }, [storyboard, setShots, setActiveShot]);

  const pushLog = useCallback((level: LogEntry['level'], text: string) => {
    setLogs((prev) => [...prev.slice(-49), { ts: Date.now(), level, text }]);
  }, []);

  const completedCount = storyboard.filter((s) => s.status === 'completed').length;
  const failedCount = storyboard.filter((s) => s.status === 'failed').length;
  const totalCount = storyboard.length;

  /** 第 1 步：根据用户输入调真 LLM 生成分镜，进入 storyboard 步骤 */
  const handleGenerateStoryboard = async () => {
    let values: any;
    try {
      values = await form.validateFields(['prompt']);
    } catch {
      return;
    }
    setScriptLoading(true);
    setErrorMsg(null);
    try {
      const result: any = await scriptApi.generate({
        productName: values.prompt,
        category: '通用',
        sellingPoints: values.prompt,
        style: 'professional',
        duration,
      });
      const shots: StoryboardItem[] = (result?.shots ?? []).map((s: any, i: number) => ({
        id: `shot_${Date.now()}_${i + 1}`,
        order: s.index ?? i + 1,
        description: s.description,
        voiceover: s.voiceover,
        caption: s.caption,
        duration: s.duration ?? Math.round(duration / 3),
        type: 'text-to-video',
        status: 'pending',
      }));
      setStoryboard(shots);
      setCurrentStep('storyboard');
      message.success(`已生成 ${shots.length} 个分镜（来源：${result?.source === 'ark' ? 'AI' : '兜底'}）`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '分镜生成失败';
      setErrorMsg(msg);
      message.error(msg);
    } finally {
      setScriptLoading(false);
    }
  };

  /** 第 2 步：拿当前 storyboard 创建后端任务，订阅 WS 实时进度 */
  const handleStartCreation = async () => {
    if (storyboard.length === 0) {
      message.warning('请先生成分镜');
      return;
    }
    setCurrentStep('generating');
    setOverallProgress(0);
    setLogs([]);
    setErrorMsg(null);
    setResultUrl(null);
    setGenerating(true);
    pushLog('info', `提交任务，共 ${storyboard.length} 个分镜...`);

    try {
      const created = await creationApi.createTask({
        title: form.getFieldValue('prompt') || '带货短视频',
        storyboard: storyboard.map((s) => ({
          id: s.id,
          index: s.order,
          description: s.description,
          voiceover: s.voiceover,
          caption: s.caption,
          duration: s.duration,
        })),
        aspectRatio,
        quality,
      });
      setTaskId(created.id);
      pushLog('info', `任务已创建：${created.id}`);

      // 订阅 WS
      wsCleanup.current?.();
      wsCleanup.current = creationApi.subscribe(created.id, {
        onProgress: (data) => {
          setOverallProgress(data.progress);
          if (data.message) pushLog('info', data.message);
        },
        onShotProgress: (data) => {
          if (data.message) pushLog(data.status === 'failed' ? 'error' : 'info', data.message);
          setStoryboard((prev) =>
            prev.map((s) =>
              s.id === data.shotId
                ? {
                    ...s,
                    status:
                      data.status === 'completed'
                        ? 'completed'
                        : data.status === 'failed'
                          ? 'failed'
                          : 'generating',
                    errorMessage: data.status === 'failed' ? data.message : undefined,
                  }
                : s,
            ),
          );
        },
        onComplete: (data) => {
          setOverallProgress(100);
          setGenerating(false);
          pushLog('success', '所有分镜处理完成');
          // 用 result 回填分镜的 videoUrl / thumbnailUrl
          const resultShots: any[] = data?.result?.shots ?? [];
          if (resultShots.length > 0) {
            setStoryboard((prev) =>
              prev.map((s) => {
                const r = resultShots.find((x: any) => x.id === s.id);
                if (!r) return s;
                return {
                  ...s,
                  status: r.status ?? s.status,
                  videoUrl: r.videoUrl ?? s.videoUrl,
                  thumbnailUrl: r.thumbnailUrl ?? s.thumbnailUrl,
                  errorMessage: r.errorMessage ?? s.errorMessage,
                };
              }),
            );
          }
          if (data?.result?.url) {
            setResultUrl(data.result.url);
          }
          setCurrentStep('complete');
          message.success('视频生成完成！');
        },
        onError: (data) => {
          setGenerating(false);
          setErrorMsg(data?.message ?? '生成失败');
          pushLog('error', data?.message ?? '生成失败');
          message.error(data?.message ?? '生成失败');
        },
        onConnectError: () => {
          pushLog('warn', 'WebSocket 连接失败，进度将无法实时刷新');
        },
      });
    } catch (err: any) {
      setGenerating(false);
      const msg = err?.response?.data?.message || err?.message || '任务创建失败';
      setErrorMsg(msg);
      pushLog('error', msg);
      message.error(msg);
    }
  };

  const handleRegenerateShot = useCallback((shotId: string) => {
    setStoryboard((prev) =>
      prev.map((item) => (item.id === shotId ? { ...item, status: 'generating' as const } : item)),
    );
    // V0 只是更新视觉状态；真实重生在生成阶段才有意义
    setTimeout(() => {
      setStoryboard((prev) =>
        prev.map((item) =>
          item.id === shotId
            ? { ...item, status: 'pending' as const }
            : item,
        ),
      );
    }, 600);
  }, []);

  /** Agent 一键成片：先调 agent，然后切到生成态展示 */
  const handleAgentRun = async () => {
    try {
      await form.validateFields(['prompt']);
      const values = form.getFieldsValue();
      const result = await agentApi.run({
        productName: values.prompt || '视频',
        category: '通用',
        sellingPoints: '品质优良',
        targetAudience: '大众',
        style: 'professional',
        duration,
      });
      setAgentTaskId(result.taskId);
      setAgentStatus('running');

      const poll = setInterval(async () => {
        try {
          const status = await agentApi.getStatus(result.taskId);
          setAgentStatus(status.status);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(poll);
            if (status.status === 'completed') {
              message.success('AI 工作流完成！');
              setCurrentStep('complete');
            }
          }
        } catch {
          clearInterval(poll);
        }
      }, 2000);
    } catch {
      return;
    }
  };

  // 离开页面/卸载时清理 WS
  useEffect(() => {
    return () => {
      wsCleanup.current?.();
      wsCleanup.current = null;
    };
  }, []);

  const stepItems = [
    { title: '配置参数', icon: <SettingOutlined /> },
    { title: '分镜编排', icon: <FileTextOutlined /> },
    { title: '视频生成', icon: <ThunderboltOutlined /> },
    { title: '完成导出', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 步骤条 */}
      <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg) var(--spacing-xxxl)' }}>
        <Steps
          current={['config', 'storyboard', 'generating', 'complete'].indexOf(currentStep)}
          items={stepItems.map((item) => ({
            ...item,
            title: isMobile ? '' : item.title,
          }))}
          size={isMobile ? 'small' : 'default'}
        />
      </GlassPanel>

      {errorMsg && (
        <Alert
          type="error"
          showIcon
          closable
          message={errorMsg}
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}
        />
      )}

      {/* 配置 / 分镜阶段 */}
      {(currentStep === 'config' || currentStep === 'storyboard') && (
        <Row gutter={24}>
          {/* 左侧配置 */}
          <Col xs={24} lg={8}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <SettingOutlined style={{ color: 'var(--brand-primary)' }} />
                <Text strong style={{ color: 'var(--text-primary)' }}>创作配置</Text>
              </div>
              <div style={{ padding: 'var(--spacing-xl)' }}>
                <Form
                  form={form}
                  layout="vertical"
                  size="large"
                  onValuesChange={(_, all) => setFormValues(all)}
                >
                  <Form.Item
                    name="prompt"
                    label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频主题 / 商品</Text>}
                    rules={[{ required: true, message: '请输入主题或商品描述' }]}
                  >
                    <TextArea
                      placeholder="例：夏日清爽防晒霜带货视频，主推 SPF50、3 秒成膜、不假白"
                      rows={3}
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频模型</Text>}>
                    <Radio.Group value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                      <Space direction="vertical">
                        <Radio value="seedance-1.5-pro">
                          <Space>
                            <Text style={{ color: 'var(--text-primary)' }}>Doubao-Seedance-1.5-pro</Text>
                            <Tag color="green" style={{ borderRadius: 20 }}>主力</Tag>
                          </Space>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>画面比例</Text>}>
                    <Segmented
                      options={aspectRatios.map((r) => ({ label: r.label, value: r.value }))}
                      value={aspectRatio}
                      onChange={(v) => setAspectRatio(v as any)}
                      block
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>画质</Text>}>
                    <Segmented
                      options={qualityOptions.map((q) => ({ label: q.label, value: q.value }))}
                      value={quality}
                      onChange={(v) => setQuality(v as any)}
                      block
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频总时长</Text>}>
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
                      系统将生成 3 个分镜（V0 默认）
                    </Text>
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>附加选项</Text>}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'var(--text-primary)' }}>自动配音（V1）</Text>
                        <Switch disabled />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'var(--text-primary)' }}>自动字幕（V1）</Text>
                        <Switch disabled />
                      </div>
                    </Space>
                  </Form.Item>

                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Button
                      type="default"
                      icon={<FileTextOutlined />}
                      block
                      size="large"
                      style={{ borderRadius: 'var(--radius-md)', height: 44 }}
                      loading={scriptLoading}
                      onClick={handleGenerateStoryboard}
                    >
                      {currentStep === 'storyboard' ? '重新生成分镜' : '生成分镜'}
                    </Button>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      block
                      size="large"
                      disabled={storyboard.length === 0}
                      style={{ borderRadius: 'var(--radius-md)', height: 48, fontSize: 15 }}
                      onClick={handleStartCreation}
                    >
                      开始视频生成
                    </Button>
                    <Button
                      icon={<RobotOutlined />}
                      block
                      size="large"
                      style={{ borderRadius: 'var(--radius-md)', height: 44 }}
                      onClick={handleAgentRun}
                      loading={agentStatus === 'running'}
                    >
                      AI 一键成片 {agentStatus === 'running' && <Badge status="processing" style={{ marginLeft: 8 }} />}
                    </Button>
                  </Space>
                </Form>
              </div>
            </GlassPanel>
          </Col>

          {/* 右侧分镜 */}
          <Col xs={24} lg={16}>
            <GlassPanel variant="card" style={{ overflow: 'hidden', padding: 0, minHeight: 480 }}>
              {storyboard.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480 }}>
                  <Empty
                    description={
                      <Text style={{ color: 'var(--text-tertiary)' }}>
                        填写左侧主题，点击"生成分镜"
                      </Text>
                    }
                  />
                </div>
              ) : (
                <StoryboardEditor onRegenerateShot={handleRegenerateShot} />
              )}
            </GlassPanel>
          </Col>
        </Row>
      )}

      {/* 生成阶段 */}
      {currentStep === 'generating' && (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <ThunderboltOutlined style={{ color: 'var(--brand-primary)' }} spin={generating} />
                <Text strong style={{ color: 'var(--text-primary)' }}>视频生成中</Text>
                {taskId && (
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 'auto' }}>
                    任务 ID：{taskId.slice(0, 8)}…
                  </Text>
                )}
              </div>
              <div style={{ padding: 'var(--spacing-xxxl)' }}>
                {/* 总进度 */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xxl)' }}>
                  <Progress
                    type="circle"
                    percent={overallProgress}
                    size={160}
                    strokeColor={{ '0%': '#6366f1', '100%': '#a855f7' }}
                    format={(percent) => (
                      <div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{percent}%</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {completedCount}/{totalCount} 分镜
                          {failedCount > 0 ? ` · ${failedCount} 失败` : ''}
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* 分镜进度 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 12,
                  }}
                >
                  {storyboard.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: 'var(--spacing-lg)',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${
                          item.status === 'completed'
                            ? '#10b981'
                            : item.status === 'failed'
                              ? '#ef4444'
                              : item.status === 'generating'
                                ? '#6366f1'
                                : 'var(--border-color)'
                        }`,
                        background: item.status === 'generating' ? 'rgba(99,102,241,0.1)' : 'transparent',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>
                        {item.status === 'completed' && <CheckCircleOutlined style={{ color: '#10b981' }} />}
                        {item.status === 'generating' && <LoadingOutlined style={{ color: 'var(--brand-primary)' }} spin />}
                        {item.status === 'pending' && <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />}
                        {item.status === 'failed' && <Tag color="red" style={{ borderRadius: 20 }}>失败</Tag>}
                      </div>
                      <Text strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                        分镜 {item.order}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </Col>
          <Col xs={24} lg={8}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <Text strong style={{ color: 'var(--text-primary)' }}>实时日志</Text>
              </div>
              <div style={{ padding: 'var(--spacing-lg)', maxHeight: 500, overflow: 'auto' }}>
                {logs.length === 0 ? (
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>等待开始...</Text>
                ) : (
                  <Timeline
                    items={logs.map((l) => ({
                      color:
                        l.level === 'success'
                          ? 'green'
                          : l.level === 'error'
                            ? 'red'
                            : l.level === 'warn'
                              ? 'orange'
                              : 'blue',
                      children: (
                        <div>
                          <Text style={{ fontSize: 13, color: 'var(--text-primary)' }}>{l.text}</Text>
                          <div>
                            <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {new Date(l.ts).toLocaleTimeString()}
                            </Text>
                          </div>
                        </div>
                      ),
                    }))}
                  />
                )}
              </div>
            </GlassPanel>
          </Col>
        </Row>
      )}

      {/* 完成阶段 */}
      {currentStep === 'complete' && (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xxxl) 0' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981' }} />
          </div>
          <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
            视频生成完成！
          </Title>
          <Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto 32px' }}>
            共 {totalCount} 个分镜片段，{completedCount} 成功
            {failedCount > 0 ? `，${failedCount} 失败` : ''}，总时长约{' '}
            {storyboard.reduce((sum, s) => sum + (s.duration ?? 0), 0)} 秒
          </Paragraph>

          {/* 视频预览区 */}
          <GlassPanel variant="card" style={{ maxWidth: 640, margin: '0 auto 24px', padding: 'var(--spacing-xl)' }}>
            <div
              style={{
                aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                maxWidth: aspectRatio === '9:16' ? 280 : 480,
                margin: '0 auto',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {resultUrl ? (
                <video
                  src={resultUrl}
                  controls
                  autoPlay={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#fff', opacity: 0.6 }}>
                  <PlayCircleOutlined style={{ fontSize: 56 }} />
                  <div style={{ marginTop: 8, fontSize: 13 }}>暂无可播放的视频</div>
                </div>
              )}
            </div>
            {resultUrl && (
              <Text
                copyable={{ text: resultUrl }}
                style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}
              >
                视频地址（24h 内有效）：{resultUrl.slice(0, 60)}…
              </Text>
            )}
          </GlassPanel>

          <Space size="middle" wrap>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              size="large"
              onClick={() => setExportOpen(true)}
              style={{ borderRadius: 'var(--radius-md)', height: 44 }}
            >
              导出视频
            </Button>
            <Button
              icon={<ReloadOutlined />}
              size="large"
              style={{ borderRadius: 'var(--radius-md)', height: 44 }}
              onClick={() => {
                setCurrentStep('config');
                setStoryboard([]);
                setLogs([]);
                setOverallProgress(0);
                setResultUrl(null);
                setTaskId(null);
              }}
            >
              重新创作
            </Button>
            <Button
              icon={<EditOutlined />}
              size="large"
              style={{ borderRadius: 'var(--radius-md)', height: 44 }}
              onClick={() => setCurrentStep('storyboard')}
            >
              编辑分镜
            </Button>
          </Space>

          <ExportPanel creationTaskId={taskId ?? 'current'} open={exportOpen} onClose={() => setExportOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default CreationPage;
