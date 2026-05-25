import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button, Input, Form, Space, Typography, Steps, Progress,
  Tag, Row, Col, Slider, Switch, message,
  Timeline, Segmented, Radio, Badge,
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
import { ExportPanel } from './components/ExportPanel';
import { useAutosave, getDraft, clearDraft } from '../../hooks/useAutosave';
import '../../components/storyboard/storyboard.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type CreationStep = 'config' | 'storyboard' | 'generating' | 'complete';

interface StoryboardItem {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  referenceImage?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
}

const mockStoryboard: StoryboardItem[] = [
  { id: '1', order: 1, description: '产品外观展示，旋转360度', duration: 5, type: 'text-to-video', status: 'completed', videoUrl: '#' },
  { id: '2', order: 2, description: '真人上脸使用效果对比', duration: 8, type: 'text-to-video', status: 'completed', videoUrl: '#' },
  { id: '3', order: 3, description: '户外紫外线实测场景', duration: 6, type: 'text-to-video', status: 'generating' },
  { id: '4', order: 4, description: '成分解析动画展示', duration: 5, type: 'text-to-video', status: 'pending' },
  { id: '5', order: 5, description: '购买引导CTA画面', duration: 3, type: 'text-to-video', status: 'pending' },
];

const aspectRatios = [
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '16:9', desc: 'YouTube/B站' },
  { label: '1:1 方形', value: '1:1', desc: '小红书/朋友圈' },
];

const qualityOptions = [
  { label: '标准', value: 'standard', desc: '720p, 快速生成' },
  { label: '高清', value: 'hd', desc: '1080p, 推荐' },
  { label: '超清', value: '4k', desc: '4K, 较慢' },
];

function CreationPage() {
  const [currentStep, setCurrentStep] = useState<CreationStep>('config');
  const [overallProgress, setOverallProgress] = useState(0);
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>(mockStoryboard);
  const [selectedModel, setSelectedModel] = useState('seedance-1.5-pro');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [quality, setQuality] = useState('hd');
  const [form] = Form.useForm();
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const [, setAgentTaskId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const DRAFT_KEY = 'creation_config';
  const draftRestored = useRef(false);

  // Check for draft on mount
  useEffect(() => {
    if (draftRestored.current) return;
    const draft = getDraft<{ prompt?: string; model?: string; aspectRatio?: string; quality?: string }>(DRAFT_KEY);
    if (draft && draft.prompt) {
      form.setFieldsValue({ prompt: draft.prompt });
      if (draft.model) setSelectedModel(draft.model);
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
      if (draft.quality) setQuality(draft.quality);
      message.info('已恢复上次的创作配置');
    }
    draftRestored.current = true;
  }, [form]);

  // Autosave form values
  const formValues = Form.useWatch([], form);
  useAutosave({
    key: DRAFT_KEY,
    data: { prompt: formValues?.prompt, model: selectedModel, aspectRatio, quality },
    enabled: currentStep === 'config',
  });

  // Clear draft on successful completion
  useEffect(() => {
    if (currentStep === 'complete') {
      clearDraft(DRAFT_KEY);
    }
  }, [currentStep]);

  const { isMobile } = useShell();

  const setShots = useStoryboardStore((s) => s.setShots);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);

  useEffect(() => {
    const shots: Shot[] = mockStoryboard.map((m) => ({
      id: m.id,
      order: m.order,
      description: m.description,
      duration: m.duration,
      type: m.type,
      script: '',
      status: m.status,
      videoUrl: m.videoUrl,
    }));
    setShots(shots);
    setActiveShot(shots[0]?.id ?? null);
  }, []);

  const handleRegenerateShot = useCallback((shotId: string) => {
    setStoryboard((prev) => prev.map((item) =>
      item.id === shotId ? { ...item, status: 'generating' as const } : item
    ));
    setTimeout(() => {
      setStoryboard((prev) => prev.map((item) =>
        item.id === shotId ? { ...item, status: 'completed' as const, videoUrl: '#' } : item
      ));
      message.success('分镜重新生成成功');
    }, 3000);
  }, []);

  const completedCount = storyboard.filter((s) => s.status === 'completed').length;
  const totalCount = storyboard.length;

  const handleStartCreation = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    setCurrentStep('generating');
    setOverallProgress(Math.round((completedCount / totalCount) * 100));

    let currentIdx = storyboard.findIndex((s) => s.status === 'pending');
    if (currentIdx === -1) currentIdx = totalCount;

    const simulateGeneration = () => {
      if (currentIdx >= totalCount) {
        setCurrentStep('complete');
        setOverallProgress(100);
        message.success('所有分镜生成完成！');
        return;
      }

      setStoryboard((prev) => prev.map((item, i) =>
        i === currentIdx ? { ...item, status: 'generating' as const } : item
      ));

      setTimeout(() => {
        setStoryboard((prev) => prev.map((item, i) =>
          i === currentIdx ? { ...item, status: 'completed' as const, videoUrl: '#' } : item
        ));
        currentIdx++;
        setOverallProgress(Math.round((completedCount + currentIdx) / totalCount * 100));
        progressTimer.current = setTimeout(simulateGeneration, 2000);
      }, 3000);
    };

    progressTimer.current = setTimeout(simulateGeneration, 1000);
  };

  const handleAgentRun = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      const result = await agentApi.run({
        productName: values.prompt || '视频',
        category: '通用',
        sellingPoints: '品质优良',
        targetAudience: '大众',
        style: 'professional',
        duration: 30,
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

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
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
        <Steps current={['config', 'storyboard', 'generating', 'complete'].indexOf(currentStep)} items={stepItems.map((item) => ({
          ...item,
          title: isMobile ? '' : item.title,
        }))} size={isMobile ? 'small' : 'default'} />
      </GlassPanel>

      {/* 配置阶段 */}
      {(currentStep === 'config' || currentStep === 'storyboard') && (
        <Row gutter={24}>
          {/* 左侧配置 */}
          <Col xs={24} lg={8}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <SettingOutlined style={{ color: 'var(--brand-primary)' }} />
                <Text strong style={{ color: 'var(--text-primary)' }}>创作配置</Text>
              </div>
              <div style={{ padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)' }}>
                <Form form={form} layout="vertical" size="large">
                  <Form.Item
                    name="prompt"
                    label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频主题</Text>}
                    rules={[{ required: true, message: '请输入视频主题' }]}
                    initialValue="夏日清爽防晒霜带货视频"
                  >
                    <TextArea
                      placeholder="描述你想要生成的视频内容"
                      rows={3}
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>AI 模型</Text>}>
                    <Radio.Group value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                      <Space direction="vertical">
                        <Radio value="seedance-1.5-pro">
                          <Space><Text style={{ color: 'var(--text-primary)' }}>Doubao-Seedance-1.5-pro</Text><Tag color="green" style={{ borderRadius: 20 }}>主力</Tag></Space>
                        </Radio>
                        <Radio value="seedance-1.5-lite">
                          <Space><Text style={{ color: 'var(--text-primary)' }}>Doubao-Seedance-1.5-lite</Text><Tag color="blue" style={{ borderRadius: 20 }}>备选</Tag></Space>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>画面比例</Text>}>
                    <Segmented
                      options={aspectRatios.map((r) => ({ label: r.label, value: r.value }))}
                      value={aspectRatio}
                      onChange={(v) => setAspectRatio(v as string)}
                      block
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>画质</Text>}>
                    <Segmented
                      options={qualityOptions.map((q) => ({ label: `${q.label} - ${q.desc}`, value: q.value }))}
                      value={quality}
                      onChange={(v) => setQuality(v as string)}
                      block
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频时长</Text>}>
                    <Slider
                      min={5}
                      max={120}
                      step={5}
                      marks={{ 5: '5s', 15: '15s', 30: '30s', 60: '1min', 120: '2min' }}
                      defaultValue={30}
                      tooltip={{ formatter: (v) => `${v}秒` }}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>附加选项</Text>}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'var(--text-primary)' }}>自动配音</Text>
                        <Switch defaultChecked />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'var(--text-primary)' }}>自动字幕</Text>
                        <Switch defaultChecked />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'var(--text-primary)' }}>背景音乐</Text>
                        <Switch defaultChecked />
                      </div>
                    </Space>
                  </Form.Item>

                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      block
                      size="large"
                      style={{ borderRadius: 'var(--radius-md)', height: 44 }}
                      onClick={() => setCurrentStep('storyboard')}
                    >
                      生成分镜
                    </Button>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      block
                      size="large"
                      style={{ borderRadius: 'var(--radius-md)', height: 48, fontSize: 15 }}
                      onClick={handleStartCreation}
                    >
                      一键生成视频
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
            <GlassPanel variant="card" style={{ overflow: 'hidden', padding: 0 }}>
              <StoryboardEditor onRegenerateShot={handleRegenerateShot} />
            </GlassPanel>
          </Col>
        </Row>
      )}

      {/* 生成阶段 */}
      {currentStep === 'generating' && (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <ThunderboltOutlined style={{ color: 'var(--brand-primary)' }} spin />
                <Text strong style={{ color: 'var(--text-primary)' }}>视频生成中</Text>
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
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>总体进度</div>
                      </div>
                    )}
                  />
                </div>

                {/* 分镜进度 */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {storyboard.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: 'var(--spacing-lg)',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${item.status === 'completed' ? '#10b981' : item.status === 'generating' ? '#6366f1' : 'var(--border-color)'}`,
                        background: item.status === 'generating' ? 'rgba(99,102,241,0.1)' : 'transparent',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>
                        {item.status === 'completed' && <CheckCircleOutlined style={{ color: '#10b981' }} />}
                        {item.status === 'generating' && <LoadingOutlined style={{ color: 'var(--brand-primary)' }} spin />}
                        {item.status === 'pending' && <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />}
                      </div>
                      <Text strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>分镜 {item.order}</Text>
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</Text>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </Col>
          <Col xs={24} lg={8}>
            <GlassPanel variant="card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <Text strong style={{ color: 'var(--text-primary)' }}>生成日志</Text>
              </div>
              <div style={{ padding: 'var(--spacing-lg)', maxHeight: 500, overflow: 'auto' }}>
                <Timeline
                  items={[
                    { color: 'green', children: <Text style={{ fontSize: 13, color: 'var(--text-primary)' }}>分镜 1 生成完成 ✓</Text> },
                    { color: 'green', children: <Text style={{ fontSize: 13, color: 'var(--text-primary)' }}>分镜 2 生成完成 ✓</Text> },
                    { color: 'blue', children: <Text style={{ fontSize: 13, color: 'var(--text-primary)' }}>分镜 3 正在生成中...</Text> },
                    { color: 'gray', children: <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>分镜 4 等待中</Text> },
                    { color: 'gray', children: <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>分镜 5 等待中</Text> },
                  ]}
                />
              </div>
            </GlassPanel>
          </Col>
        </Row>
      )}

      {/* 完成阶段 */}
      {currentStep === 'complete' && (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xxxl) 0' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(16,185,129,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981' }} />
          </div>
          <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 8 }}>视频生成完成！</Title>
          <Paragraph type="secondary" style={{ maxWidth: 400, margin: '0 auto 32px' }}>
            共生成 {totalCount} 个分镜片段，总时长约 {storyboard.reduce((sum, s) => sum + s.duration, 0)} 秒
          </Paragraph>

          {/* 视频预览区 */}
          <GlassPanel variant="card" style={{ maxWidth: 640, margin: '0 auto 24px', padding: 'var(--spacing-xl)' }}>
            <div style={{
              aspectRatio: '9/16',
              maxWidth: 280,
              margin: '0 auto',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PlayCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.8, cursor: 'pointer' }} />
            </div>
          </GlassPanel>

          <Space size="middle" direction={isMobile ? 'vertical' : 'horizontal'} style={isMobile ? { width: '100%' } : undefined}>
            <Button block={isMobile} type="primary" icon={<DownloadOutlined />} size="large" onClick={() => setExportOpen(true)} style={{ borderRadius: 'var(--radius-md)', height: 44 }}>
              导出视频
            </Button>
            <Button block={isMobile} icon={<ReloadOutlined />} size="large" style={{ borderRadius: 'var(--radius-md)', height: 44 }}>
              重新生成
            </Button>
            <Button block={isMobile} icon={<EditOutlined />} size="large" style={{ borderRadius: 'var(--radius-md)', height: 44 }}>
              编辑分镜
            </Button>
          </Space>

          <ExportPanel creationTaskId="current" open={exportOpen} onClose={() => setExportOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default CreationPage;
