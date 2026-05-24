import { useState } from 'react';
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
          <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ padding: 'var(--spacing-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-xl)' }}>
                <ThunderboltOutlined style={{ color: 'var(--brand-primary)', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>剧本配置</Text>
              </div>
              <Form form={form} layout="vertical" size="large">
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
                      { value: 'digital', label: '数码3C' },
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                      </div>
                    ))}
                  </div>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>视频时长</Text>}>
                  <Slider
                    min={15}
                    max={120}
                    step={5}
                    marks={{ 15: '15s', 30: '30s', 45: '45s', 60: '1min', 90: '1.5min', 120: '2min' }}
                    defaultValue={45}
                    tooltip={{ formatter: (v) => `${v}秒` }}
                  />
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
                  style={{ borderRadius: 'var(--radius-md)', height: 48, fontSize: 16 }}
                >
                  {loading ? 'AI 创作中...' : '生成剧本'}
                </Button>
              </Form>
            </div>
          </GlassPanel>
        </Col>

        {/* 右侧：结果面板 */}
        <Col xs={24} lg={14}>
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

          {!loading && !generated && (
            <GlassPanel variant="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 64, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                <FileTextOutlined />
              </div>
              <Title level={4} style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>等待创作</Title>
              <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
                填写左侧商品信息，AI 将为你生成专业带货剧本，包含分镜脚本、配音文案和 BGM 推荐
              </Paragraph>
            </GlassPanel>
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
                    <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{mockScriptResult.title}</Text>
                    <Tag color="blue">⏱ {mockScriptResult.duration}</Tag>
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
                    <Text strong style={{ color: 'var(--text-primary)' }}>分镜脚本</Text>
                  </Space>
                  <Space>
                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(mockScriptResult.hooks.map(h => h.content).join('\n'))}>复制全部</Button>
                    <Button icon={<SaveOutlined />}>保存</Button>
                  </Space>
                </div>
                {mockScriptResult.hooks.map((hook, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      padding: 'var(--spacing-md) var(--spacing-xl)',
                      borderBottom: `1px solid var(--border-color)`,
                      borderLeft: `3px solid ${hookTypeColors[hook.type]}`,
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 72, flexShrink: 0 }}>
                      <Tag color={hookTypeColors[hook.type]} style={{ borderRadius: 20, fontSize: 11 }}>{hookTypeLabels[hook.type]}</Tag>
                      <div style={{ marginTop: 4 }}><Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hook.time}</Text></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{hook.content}</Text>
                    </div>
                    <Tooltip title="复制"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(hook.content)} /></Tooltip>
                  </div>
                ))}
              </GlassPanel>

              {/* 配音建议 */}
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
                  <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>{mockScriptResult.voiceover}</Paragraph>
                </div>
              </GlassPanel>

              {/* BGM 推荐 */}
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
                  <Paragraph style={{ color: 'var(--text-primary)', margin: 0 }}>{mockScriptResult.bgmSuggestion}</Paragraph>
                </div>
              </GlassPanel>

              {/* 标签 */}
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
                    {mockScriptResult.tags.map((tag, i) => (
                      <Tag key={i} color="blue" style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>#{tag}</Tag>
                    ))}
                  </Space>
                </div>
              </GlassPanel>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default ScriptPage;
