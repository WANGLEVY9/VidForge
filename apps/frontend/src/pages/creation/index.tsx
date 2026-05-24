import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Input, Form, Select, Space, Typography, Steps, Progress,
  Tag, Divider, Row, Col, Slider, Switch, Tooltip, message, Alert,
  Timeline, Empty, Modal, Radio,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined,
  VideoCameraOutlined, PictureOutlined, SoundOutlined,
  ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  LoadingOutlined, EyeOutlined, DownloadOutlined, SettingOutlined,
  FileTextOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  SwapOutlined, FullscreenOutlined,
} from '@ant-design/icons';
import { theme } from '../../theme/tokens';

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
  const [generating, setGenerating] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>(mockStoryboard);
  const [selectedModel, setSelectedModel] = useState('seedance-1.5-pro');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [quality, setQuality] = useState('hd');
  const [form] = Form.useForm();
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  const completedCount = storyboard.filter((s) => s.status === 'completed').length;
  const totalCount = storyboard.length;

  const handleStartCreation = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    setCurrentStep('generating');
    setGenerating(true);
    setOverallProgress(Math.round((completedCount / totalCount) * 100));

    // 模拟逐个生成分镜
    let currentIdx = storyboard.findIndex((s) => s.status === 'pending');
    if (currentIdx === -1) currentIdx = storyboard.length; // all done

    const simulateGeneration = () => {
      if (currentIdx >= totalCount) {
        setGenerating(false);
        setCurrentStep('complete');
        setOverallProgress(100);
        message.success('所有分镜生成完成！');
        return;
      }

      // 标记当前为生成中
      setStoryboard((prev) => prev.map((item, i) =>
        i === currentIdx ? { ...item, status: 'generating' as const } : item
      ));

      // 模拟生成完成
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

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
  }, []);

  const handleRetryFailed = (id: string) => {
    setStoryboard((prev) => prev.map((item) =>
      item.id === id ? { ...item, status: 'generating' as const } : item
    ));
    setTimeout(() => {
      setStoryboard((prev) => prev.map((item) =>
        item.id === id ? { ...item, status: 'completed' as const, videoUrl: '#' } : item
      ));
      message.success('重新生成成功');
    }, 3000);
  };

  const stepItems = [
    { title: '配置参数', icon: <SettingOutlined /> },
    { title: '分镜编排', icon: <FileTextOutlined /> },
    { title: '视频生成', icon: <ThunderboltOutlined /> },
    { title: '完成导出', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 步骤条 */}
      <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }} styles={{ body: { padding: `${theme.spacing.lg}px ${theme.spacing.xxxl}px` } }}>
        <Steps current={['config', 'storyboard', 'generating', 'complete'].indexOf(currentStep)} items={stepItems} />
      </Card>

      {/* 配置阶段 */}
      {(currentStep === 'config' || currentStep === 'storyboard') && (
        <Row gutter={24}>
          {/* 左侧配置 */}
          <Col xs={24} lg={8}>
            <Card
              title={<Space><SettingOutlined style={{ color: theme.colors.primary }} />创作配置</Space>}
              style={{ borderRadius: theme.borderRadius.lg, border: 'none' }}
              styles={{ body: { padding: theme.spacing.xl } }}
            >
              <Form form={form} layout="vertical" size="large">
                <Form.Item
                  name="prompt"
                  label={<Text strong>视频主题</Text>}
                  rules={[{ required: true, message: '请输入视频主题' }]}
                  initialValue="夏日清爽防晒霜带货视频"
                >
                  <TextArea
                    placeholder="描述你想要生成的视频内容"
                    rows={3}
                    style={{ borderRadius: theme.borderRadius.md }}
                  />
                </Form.Item>

                <Form.Item label={<Text strong>AI 模型</Text>}>
                  <Radio.Group value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                    <Space direction="vertical">
                      <Radio value="seedance-1.5-pro">
                        <Space><Text>Doubao-Seedance-1.5-pro</Text><Tag color="green" style={{ borderRadius: 20 }}>主力</Tag></Space>
                      </Radio>
                      <Radio value="seedance-1.5-lite">
                        <Space><Text>Doubao-Seedance-1.5-lite</Text><Tag color="blue" style={{ borderRadius: 20 }}>备选</Tag></Space>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label={<Text strong>画面比例</Text>}>
                  <Segmented
                    options={aspectRatios.map((r) => ({ label: r.label, value: r.value }))}
                    value={aspectRatio}
                    onChange={(v) => setAspectRatio(v as string)}
                    block
                  />
                </Form.Item>

                <Form.Item label={<Text strong>画质</Text>}>
                  <Segmented
                    options={qualityOptions.map((q) => ({ label: `${q.label} - ${q.desc}`, value: q.value }))}
                    value={quality}
                    onChange={(v) => setQuality(v as string)}
                    block
                  />
                </Form.Item>

                <Form.Item label={<Text strong>视频时长</Text>}>
                  <Slider
                    min={5}
                    max={120}
                    step={5}
                    marks={{ 5: '5s', 15: '15s', 30: '30s', 60: '1min', 120: '2min' }}
                    defaultValue={30}
                    tooltip={{ formatter: (v) => `${v}秒` }}
                  />
                </Form.Item>

                <Form.Item label={<Text strong>附加选项</Text>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>自动配音</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>自动字幕</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>背景音乐</Text>
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
                    style={{ borderRadius: theme.borderRadius.md, height: 44 }}
                    onClick={() => setCurrentStep('storyboard')}
                  >
                    生成分镜
                  </Button>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    block
                    size="large"
                    style={{ borderRadius: theme.borderRadius.md, height: 48, fontSize: 15 }}
                    onClick={handleStartCreation}
                  >
                    一键生成视频
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>

          {/* 右侧分镜 */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <VideoCameraOutlined style={{ color: theme.colors.primary }} />
                  <span>分镜脚本</span>
                  <Tag color="blue">{totalCount} 个分镜</Tag>
                  <Tag color="green">{completedCount} 已完成</Tag>
                </Space>
              }
              extra={<Button icon={<PlusOutlined />} type="dashed">添加分镜</Button>}
              style={{ borderRadius: theme.borderRadius.lg, border: 'none' }}
              styles={{ body: { padding: 0 } }}
            >
              {storyboard.map((item, idx) => {
                const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
                  pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
                  generating: { color: 'processing', icon: <LoadingOutlined />, text: '生成中' },
                  completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
                  failed: { color: 'error', icon: <ClockCircleOutlined />, text: '失败' },
                };
                const st = statusConfig[item.status];

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: `1px solid ${theme.colors.borderColorSecondary}`,
                      minHeight: 100,
                    }}
                  >
                    {/* 序号 */}
                    <div style={{
                      width: 56, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: theme.colors.bgSpotlight, flexShrink: 0,
                    }}>
                      <Text strong style={{ fontSize: 20, color: theme.colors.primary }}>{item.order}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{item.duration}s</Text>
                    </div>

                    {/* 预览区 */}
                    <div style={{
                      width: 160, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: theme.colors.bgSpotlight,
                      borderRight: `1px solid ${theme.colors.borderColorSecondary}`,
                      flexShrink: 0,
                    }}>
                      {item.status === 'completed' ? (
                        <div style={{
                          width: 120, height: 68, borderRadius: theme.borderRadius.sm,
                          background: theme.colors.gradientDark, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                          <PlayCircleOutlined style={{ fontSize: 28, color: '#fff', opacity: 0.9 }} />
                        </div>
                      ) : item.status === 'generating' ? (
                        <div style={{ textAlign: 'center' }}>
                          <LoadingOutlined style={{ fontSize: 24, color: theme.colors.primary }} spin />
                          <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11 }}>生成中...</Text></div>
                        </div>
                      ) : (
                        <div style={{
                          width: 120, height: 68, borderRadius: theme.borderRadius.sm,
                          border: `2px dashed ${theme.colors.borderColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PictureOutlined style={{ fontSize: 24, color: theme.colors.textTertiary }} />
                        </div>
                      )}
                    </div>

                    {/* 内容区 */}
                    <div style={{ flex: 1, padding: `${theme.spacing.md}px ${theme.spacing.lg}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Space style={{ marginBottom: 4 }}>
                        <Text strong style={{ color: theme.colors.textPrimary }}>{item.description}</Text>
                        <Tag color={st.color} icon={st.icon} style={{ borderRadius: 20, fontSize: 11 }}>{st.text}</Tag>
                      </Space>
                      <Space size={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.type === 'text-to-video' ? '文生视频' : '图生视频'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>时长 {item.duration}s</Text>
                      </Space>
                    </div>

                    {/* 操作区 */}
                    <div style={{
                      width: 80, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                      borderLeft: `1px solid ${theme.colors.borderColorSecondary}`,
                      flexShrink: 0,
                    }}>
                      {item.status === 'completed' && (
                        <>
                          <Tooltip title="预览"><Button type="text" size="small" icon={<EyeOutlined />} /></Tooltip>
                          <Tooltip title="重新生成"><Button type="text" size="small" icon={<ReloadOutlined />} /></Tooltip>
                        </>
                      )}
                      {item.status === 'pending' && (
                        <>
                          <Tooltip title="编辑"><Button type="text" size="small" icon={<EditOutlined />} /></Tooltip>
                          <Tooltip title="删除"><Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: theme.colors.error }} /></Tooltip>
                        </>
                      )}
                      {item.status === 'generating' && (
                        <Tooltip title="取消"><Button type="text" size="small" icon={<PauseCircleOutlined />} /></Tooltip>
                      )}
                      {item.status === 'failed' && (
                        <Tooltip title="重试"><Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => handleRetryFailed(item.id)} style={{ color: theme.colors.warning }} /></Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </Col>
        </Row>
      )}

      {/* 生成阶段 */}
      {currentStep === 'generating' && (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card
              title={<Space><ThunderboltOutlined style={{ color: theme.colors.primary }} spin />视频生成中</Space>}
              style={{ borderRadius: theme.borderRadius.lg, border: 'none' }}
              styles={{ body: { padding: theme.spacing.xxxl } }}
            >
              {/* 总进度 */}
              <div style={{ textAlign: 'center', marginBottom: theme.spacing.xxl }}>
                <Progress
                  type="circle"
                  percent={overallProgress}
                  size={160}
                  strokeColor={theme.colors.gradientPrimary}
                  format={(percent) => (
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.textPrimary }}>{percent}%</div>
                      <div style={{ fontSize: 13, color: theme.colors.textSecondary }}>总体进度</div>
                    </div>
                  )}
                />
              </div>

              {/* 分镜进度 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {storyboard.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: theme.spacing.lg,
                      borderRadius: theme.borderRadius.lg,
                      border: `1px solid ${item.status === 'completed' ? theme.colors.success : item.status === 'generating' ? theme.colors.primary : theme.colors.borderColor}`,
                      background: item.status === 'generating' ? theme.colors.primaryBg : 'transparent',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>
                      {item.status === 'completed' && <CheckCircleOutlined style={{ color: theme.colors.success }} />}
                      {item.status === 'generating' && <LoadingOutlined style={{ color: theme.colors.primary }} spin />}
                      {item.status === 'pending' && <ClockCircleOutlined style={{ color: theme.colors.textTertiary }} />}
                    </div>
                    <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>分镜 {item.order}</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="生成日志" style={{ borderRadius: theme.borderRadius.lg, border: 'none' }} styles={{ body: { padding: theme.spacing.lg, maxHeight: 500, overflow: 'auto' } }}>
              <Timeline
                items={[
                  { color: 'green', children: <Text style={{ fontSize: 13 }}>分镜 1 生成完成 ✓</Text> },
                  { color: 'green', children: <Text style={{ fontSize: 13 }}>分镜 2 生成完成 ✓</Text> },
                  { color: 'blue', children: <Text style={{ fontSize: 13 }}>分镜 3 正在生成中...</Text> },
                  { color: 'gray', children: <Text type="secondary" style={{ fontSize: 13 }}>分镜 4 等待中</Text> },
                  { color: 'gray', children: <Text type="secondary" style={{ fontSize: 13 }}>分镜 5 等待中</Text> },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 完成阶段 */}
      {currentStep === 'complete' && (
        <div style={{ textAlign: 'center', padding: `${theme.spacing.xxxl}px 0` }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: theme.colors.successBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: theme.colors.success }} />
          </div>
          <Title level={3} style={{ marginBottom: 8 }}>视频生成完成！</Title>
          <Paragraph type="secondary" style={{ maxWidth: 400, margin: '0 auto 32px' }}>
            共生成 {totalCount} 个分镜片段，总时长约 {storyboard.reduce((sum, s) => sum + s.duration, 0)} 秒
          </Paragraph>

          {/* 视频预览区 */}
          <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', maxWidth: 640, margin: '0 auto 24px' }}>
            <div style={{
              aspectRatio: '9/16',
              maxWidth: 280,
              margin: '0 auto',
              background: theme.colors.gradientDark,
              borderRadius: theme.borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PlayCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.8, cursor: 'pointer' }} />
            </div>
          </Card>

          <Space size="middle">
            <Button type="primary" icon={<DownloadOutlined />} size="large" style={{ borderRadius: theme.borderRadius.md, height: 44 }}>
              下载视频
            </Button>
            <Button icon={<ReloadOutlined />} size="large" style={{ borderRadius: theme.borderRadius.md, height: 44 }}>
              重新生成
            </Button>
            <Button icon={<EditOutlined />} size="large" style={{ borderRadius: theme.borderRadius.md, height: 44 }}>
              编辑分镜
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}

export default CreationPage;
