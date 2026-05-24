import { useState } from 'react';
import {
  Card, Button, Input, Form, Select, Slider, Switch, Space, Typography,
  Tag, Divider, message, Row, Col, Steps, Tooltip, Spin, Alert, List,
  Segmented, Radio,
} from 'antd';
import {
  RocketOutlined, BulbOutlined, CopyOutlined, SaveOutlined,
  ReloadOutlined, FileTextOutlined, ThunderboltOutlined,
  ExperimentOutlined, CustomerServiceOutlined, ShoppingCartOutlined,
  VideoCameraOutlined, SoundOutlined, AimOutlined,
} from '@ant-design/icons';
import { theme } from '../../theme/tokens';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ScriptStyle = 'professional' | 'humorous' | 'emotional' | 'tutorial' | 'comparison';

const styleOptions: { value: ScriptStyle; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'professional', label: '专业评测', icon: <ExperimentOutlined />, desc: '客观分析产品优缺点' },
  { value: 'humorous', label: '幽默种草', icon: <BulbOutlined />, desc: '轻松搞笑的推荐风格' },
  { value: 'emotional', label: '情感共鸣', icon: <CustomerServiceOutlined />, desc: '讲故事引发情感认同' },
  { value: 'tutorial', label: '使用教程', icon: <VideoCameraOutlined />, desc: '手把手教学演示' },
  { value: 'comparison', label: '对比测评', icon: <ShoppingCartOutlined />, desc: '多产品横向对比' },
];

const mockScriptResult = {
  title: '夏日清爽防晒霜 · 3秒成膜不假白',
  duration: '45秒',
  hooks: [
    { time: '0-3s', content: '"姐妹们！这个防晒我回购了5次，今天必须给你们安利！"', type: 'hook' },
    { time: '3-10s', content: '（展示产品外观）"看这个质地，像乳液一样轻薄，上脸完全不油腻"', type: 'intro' },
    { time: '10-25s', content: '（真人上脸对比）"左边涂了，右边没涂，你们看这个对比效果！3秒成膜，完全不假白"', type: 'demo' },
    { time: '25-35s', content: '（户外实测）"带你们去楼下实测，紫外线超强，涂了它完全不怕！"', type: 'proof' },
    { time: '35-42s', content: '"SPF50+ PA++++，防水防汗，通勤户外都够用"', type: 'feature' },
    { time: '42-45s', content: '"链接在下方，现在下单还有买2送1活动，冲！"', type: 'cta' },
  ],
  voiceover: '整体语速偏快，语气活泼有感染力。开头用反问句抓注意力，中间穿插"姐妹们""冲"等口语化表达拉近距离。',
  bgmSuggestion: '推荐轻快电子风BGM，节奏感强但不喧宾夺主。参考风格：Lo-fi Beat / 轻快Vlog配乐',
  tags: ['防晒', '夏日护肤', '好物推荐', '上脸实测'],
};

const hookTypeColors: Record<string, string> = {
  hook: '#ef4444',
  intro: '#3b82f6',
  demo: '#10b981',
  proof: '#f59e0b',
  feature: '#8b5cf6',
  cta: '#ec4899',
};

const hookTypeLabels: Record<string, string> = {
  hook: '黄金开头',
  intro: '产品引入',
  demo: '效果展示',
  proof: '实测证明',
  feature: '卖点总结',
  cta: '行动号召',
};

function ScriptPage() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>('professional');
  const [form] = Form.useForm();

  const handleGenerate = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    setGenerated(false);
    // 模拟 AI 生成
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
      message.success('剧本生成成功！');
    }, 2500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制到剪贴板'));
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      <Row gutter={24}>
        {/* 左侧：输入面板 */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><ThunderboltOutlined style={{ color: theme.colors.primary }} />剧本配置</Space>}
            style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }}
            styles={{ body: { padding: theme.spacing.xl } }}
          >
            <Form form={form} layout="vertical" size="large">
              <Form.Item
                name="productName"
                label={<Text strong>商品名称</Text>}
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="例如：清爽防晒霜 SPF50+" style={{ borderRadius: theme.borderRadius.md }} />
              </Form.Item>

              <Form.Item
                name="category"
                label={<Text strong>商品品类</Text>}
                rules={[{ required: true, message: '请选择品类' }]}
              >
                <Select
                  placeholder="选择品类"
                  style={{ borderRadius: theme.borderRadius.md }}
                  options={[
                    { value: 'clothing', label: '服饰鞋包' },
                    { value: 'beauty', label: '美妆护肤' },
                    { value: 'digital', label: '数码3C' },
                    { value: 'food', label: '食品饮料' },
                    { value: 'home', label: '家居生活' },
                    { value: 'mother', label: '母婴用品' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="sellingPoints"
                label={<Text strong>核心卖点</Text>}
                rules={[{ required: true, message: '请输入至少一个卖点' }]}
                extra="多个卖点用逗号分隔"
              >
                <TextArea
                  placeholder="例如：轻薄不油腻, 3秒成膜, 不假白, 防水防汗"
                  rows={3}
                  style={{ borderRadius: theme.borderRadius.md }}
                />
              </Form.Item>

              <Form.Item
                name="targetAudience"
                label={<Text strong>目标人群</Text>}
              >
                <Select
                  mode="tags"
                  placeholder="输入或选择目标人群"
                  style={{ borderRadius: theme.borderRadius.md }}
                  options={[
                    { value: '年轻女性', label: '年轻女性' },
                    { value: '学生党', label: '学生党' },
                    { value: '宝妈', label: '宝妈' },
                    { value: '上班族', label: '上班族' },
                    { value: '健身人群', label: '健身人群' },
                  ]}
                />
              </Form.Item>

              <Divider style={{ margin: `${theme.spacing.lg}px 0` }} />

              <Form.Item label={<Text strong>视频风格</Text>}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {styleOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setScriptStyle(opt.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: theme.borderRadius.md,
                        border: `2px solid ${scriptStyle === opt.value ? theme.colors.primary : theme.colors.borderColor}`,
                        background: scriptStyle === opt.value ? theme.colors.primaryBg : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Space>
                        <span style={{ color: scriptStyle === opt.value ? theme.colors.primary : theme.colors.textSecondary }}>{opt.icon}</span>
                        <Text style={{ fontSize: 13, color: scriptStyle === opt.value ? theme.colors.primary : theme.colors.textPrimary }}>{opt.label}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </Form.Item>

              <Form.Item label={<Text strong>视频时长</Text>}>
                <Slider
                  min={15}
                  max={120}
                  step={5}
                  marks={{ 15: '15s', 30: '30s', 45: '45s', 60: '1min', 90: '1.5min', 120: '2min' }}
                  defaultValue={45}
                  tooltip={{ formatter: (v) => `${v}秒` }}
                />
              </Form.Item>

              <Form.Item label={<Text strong>附加选项</Text>}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>自动添加字幕</Text>
                    <Switch defaultChecked />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>推荐 BGM</Text>
                    <Switch defaultChecked />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>生成配音脚本</Text>
                    <Switch />
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
                style={{ borderRadius: theme.borderRadius.md, height: 48, fontSize: 16 }}
              >
                {loading ? 'AI 创作中...' : '生成剧本'}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* 右侧：结果面板 */}
        <Col xs={24} lg={14}>
          {loading && (
            <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">AI 正在创作剧本，请稍候...</Text>
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
            </Card>
          )}

          {!loading && !generated && (
            <Card style={{ borderRadius: theme.borderRadius.lg, border: 'none', textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 64, color: theme.colors.textTertiary, marginBottom: 16 }}>
                <FileTextOutlined />
              </div>
              <Title level={4} style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>等待创作</Title>
              <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
                填写左侧商品信息，AI 将为你生成专业带货剧本，包含分镜脚本、配音文案和 BGM 推荐
              </Paragraph>
            </Card>
          )}

          {!loading && generated && (
            <>
              {/* 剧本标题 */}
              <Alert
                type="success"
                showIcon
                icon={<BulbOutlined />}
                message={
                  <Space>
                    <Text strong style={{ fontSize: 16 }}>{mockScriptResult.title}</Text>
                    <Tag color="blue">⏱ {mockScriptResult.duration}</Tag>
                  </Space>
                }
                style={{ borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.lg, padding: '12px 16px' }}
              />

              {/* 分镜脚本 */}
              <Card
                title={<Space><VideoCameraOutlined style={{ color: theme.colors.primary }} />分镜脚本</Space>}
                extra={<Space><Button icon={<CopyOutlined />} onClick={() => handleCopy(mockScriptResult.hooks.map(h => h.content).join('\n'))}>复制全部</Button><Button icon={<SaveOutlined />}>保存</Button></Space>}
                style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }}
                styles={{ body: { padding: 0 } }}
              >
                {mockScriptResult.hooks.map((hook, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      padding: `${theme.spacing.md}px ${theme.spacing.xl}px`,
                      borderBottom: `1px solid ${theme.colors.borderColorSecondary}`,
                      borderLeft: `3px solid ${hookTypeColors[hook.type]}`,
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.bgSpotlight)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 72, flexShrink: 0 }}>
                      <Tag color={hookTypeColors[hook.type]} style={{ borderRadius: 20, fontSize: 11 }}>{hookTypeLabels[hook.type]}</Tag>
                      <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11 }}>{hook.time}</Text></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, lineHeight: 1.6 }}>{hook.content}</Text>
                    </div>
                    <Tooltip title="复制"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(hook.content)} /></Tooltip>
                  </div>
                ))}
              </Card>

              {/* 配音建议 */}
              <Card
                title={<Space><SoundOutlined style={{ color: theme.colors.secondary }} />配音建议</Space>}
                style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }}
                styles={{ body: { padding: theme.spacing.xl } }}
              >
                <Paragraph style={{ color: theme.colors.textPrimary, margin: 0 }}>{mockScriptResult.voiceover}</Paragraph>
              </Card>

              {/* BGM 推荐 */}
              <Card
                title={<Space><CustomerServiceOutlined style={{ color: theme.colors.success }} />BGM 推荐</Space>}
                style={{ borderRadius: theme.borderRadius.lg, border: 'none', marginBottom: theme.spacing.lg }}
                styles={{ body: { padding: theme.spacing.xl } }}
              >
                <Paragraph style={{ color: theme.colors.textPrimary, margin: 0 }}>{mockScriptResult.bgmSuggestion}</Paragraph>
              </Card>

              {/* 标签 */}
              <Card
                title={<Space><AimOutlined style={{ color: theme.colors.warning }} />推荐标签</Space>}
                style={{ borderRadius: theme.borderRadius.lg, border: 'none' }}
                styles={{ body: { padding: theme.spacing.xl } }}
              >
                <Space size={8} wrap>
                  {mockScriptResult.tags.map((tag, i) => (
                    <Tag key={i} color="blue" style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>#{tag}</Tag>
                  ))}
                </Space>
              </Card>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default ScriptPage;
