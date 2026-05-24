import { Button, Typography, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { ComparePlayer } from './components/ComparePlayer';
import { CompareMetrics } from './components/CompareMetrics';
import './ab-compare.css';

const { Title } = Typography;

const defaultVersionA = {
  label: 'Seedance Pro 高清版',
  model: 'Seedance-1.5-Pro',
  resolution: '1080p',
  duration: 30,
  shots: 5,
  tts: '女声',
  bgm: '流行',
  genTime: 12.3,
};

const defaultVersionB = {
  label: 'Seedance Lite 快速版',
  model: 'Seedance-1.5-Lite',
  resolution: '720p',
  duration: 25,
  shots: 4,
  tts: '男声',
  bgm: '无',
  genTime: 8.1,
};

const defaultMetrics = [
  { metric: '画质评分 (CLIP)', versionA: '92.3', versionB: '78.1', diff: '-15.4%', winner: 'A' as const },
  { metric: '生成速度', versionA: '12.3s', versionB: '8.1s', diff: '+34.1%', winner: 'B' as const },
  { metric: '内容完整性', versionA: '优秀', versionB: '良好', diff: '-1级', winner: 'A' as const },
  { metric: '素材匹配度', versionA: '94%', versionB: '82%', diff: '-12%', winner: 'A' as const },
  { metric: 'TTS 自然度', versionA: '4.2/5', versionB: '3.8/5', diff: '-0.4', winner: 'A' as const },
];

function AbComparePage() {
  return (
    <div className="page-enter" style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <Space>
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>A/B 对比评测</Title>
          <Tag color="blue" style={{ borderRadius: 20 }}>Beta</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />}>新建对比</Button>
      </div>

      <GlassPanel variant="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <ComparePlayer versionA={defaultVersionA} versionB={defaultVersionB} />
      </GlassPanel>

      <CompareMetrics metrics={defaultMetrics} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--spacing-lg)' }}>
        <Button type="primary">应用版本 A</Button>
        <Button>应用版本 B</Button>
        <Button>另存为模板</Button>
        <Button>导出报告</Button>
      </div>
    </div>
  );
}

export default AbComparePage;
