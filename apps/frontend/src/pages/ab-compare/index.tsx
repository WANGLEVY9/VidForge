import { useEffect, useMemo, useState } from 'react';
import { Button, Typography, Space, Tag, Select, Empty, Spin, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { ComparePlayer } from './components/ComparePlayer';
import { CompareMetrics } from './components/CompareMetrics';
import { useShell } from '../../components/layout/shell-context';
import { creationApi, CreationTask } from '../../services/creation';
import { useSpaceStore } from '../../store/useSpaceStore';
import './ab-compare.css';

const { Title } = Typography;

interface VersionConfig {
  label: string;
  model: string;
  resolution: string;
  duration: number;
  shots: number;
  tts: string;
  bgm: string;
  genTime: number;
  videoUrl?: string;
}

interface MetricRow {
  metric: string;
  versionA: string;
  versionB: string;
  diff: string;
  winner: 'A' | 'B' | 'TIE';
}

/** 把 CreationTask 转成 ComparePlayer 需要的 VersionConfig */
function toVersionConfig(task: CreationTask | null, fallbackLabel: string): VersionConfig {
  if (!task) {
    return {
      label: '尚未选择',
      model: '-',
      resolution: '-',
      duration: 0,
      shots: 0,
      tts: '-',
      bgm: '-',
      genTime: 0,
    };
  }
  const result: any = task.result ?? {};
  const compose = result.compose ?? {};
  const shots = Array.isArray(task.storyboard) ? task.storyboard.length : (result.shots?.length ?? 0);
  const genElapsedMs = task.createdAt
    ? Date.now() - new Date(task.createdAt).getTime()
    : 0;
  return {
    label: task.title || fallbackLabel,
    model: 'Doubao-Seedance-1.5-pro',
    resolution: result.resolution || '720p',
    duration: Number(result.duration ?? 0),
    shots,
    tts: compose.hasVoiceover ? '有' : '无',
    bgm: compose.hasBgm ? '有' : '无',
    genTime: Math.round((genElapsedMs / 1000) * 10) / 10,
    videoUrl: result.url,
  };
}

/** 比较两个任务,生成指标对比表 */
function buildMetrics(a: CreationTask | null, b: CreationTask | null): MetricRow[] {
  if (!a || !b) return [];
  const ra: any = a.result ?? {};
  const rb: any = b.result ?? {};
  const ca = ra.compose ?? {};
  const cb = rb.compose ?? {};

  const sa = (a.storyboard ?? []).length || (ra.shots?.length ?? 0);
  const sb = (b.storyboard ?? []).length || (rb.shots?.length ?? 0);

  const successA = ra.successCount ?? 0;
  const totalA = ra.totalCount ?? sa;
  const successB = rb.successCount ?? 0;
  const totalB = rb.totalCount ?? sb;

  const succRateA = totalA > 0 ? Math.round((successA / totalA) * 100) : 0;
  const succRateB = totalB > 0 ? Math.round((successB / totalB) * 100) : 0;

  const winner = (av: number, bv: number, higherIsBetter = true): 'A' | 'B' | 'TIE' => {
    if (av === bv) return 'TIE';
    if ((av > bv) === higherIsBetter) return 'A';
    return 'B';
  };

  return [
    {
      metric: '分镜成功率',
      versionA: `${succRateA}%`,
      versionB: `${succRateB}%`,
      diff: `${succRateA - succRateB > 0 ? '+' : ''}${succRateA - succRateB}%`,
      winner: winner(succRateA, succRateB),
    },
    {
      metric: '视频时长',
      versionA: `${ra.duration ?? 0}s`,
      versionB: `${rb.duration ?? 0}s`,
      diff: `${(ra.duration ?? 0) - (rb.duration ?? 0)}s`,
      winner: winner(ra.duration ?? 0, rb.duration ?? 0, false /* 更短更好 */),
    },
    {
      metric: '是否真实合片',
      versionA: ca.mode === 'composed' ? '是' : '否',
      versionB: cb.mode === 'composed' ? '是' : '否',
      diff: ca.mode === cb.mode ? '相同' : '不同',
      winner: winner(ca.mode === 'composed' ? 1 : 0, cb.mode === 'composed' ? 1 : 0),
    },
    {
      metric: 'TTS 配音',
      versionA: ca.hasVoiceover ? '有' : '无',
      versionB: cb.hasVoiceover ? '有' : '无',
      diff: ca.hasVoiceover === cb.hasVoiceover ? '相同' : '不同',
      winner: winner(ca.hasVoiceover ? 1 : 0, cb.hasVoiceover ? 1 : 0),
    },
    {
      metric: '字幕烧录',
      versionA: ca.subtitleBurned ? '有' : '无',
      versionB: cb.subtitleBurned ? '有' : '无',
      diff: ca.subtitleBurned === cb.subtitleBurned ? '相同' : '不同',
      winner: winner(ca.subtitleBurned ? 1 : 0, cb.subtitleBurned ? 1 : 0),
    },
    {
      metric: '产出文件',
      versionA: ca.fileSize ? `${(ca.fileSize / 1024 / 1024).toFixed(1)}MB` : '-',
      versionB: cb.fileSize ? `${(cb.fileSize / 1024 / 1024).toFixed(1)}MB` : '-',
      diff: '-',
      winner: 'TIE',
    },
  ];
}

function AbComparePage() {
  const { isMobile } = useShell();
  const activeSpaceId = useSpaceStore((s) => s.activeId);
  const [tasks, setTasks] = useState<CreationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const list = await creationApi.getList(activeSpaceId ?? undefined);
      // 只展示已完成的任务,便于做对比
      const completed = list.filter((t) => t.status === 'completed');
      setTasks(completed);
      // 默认选最近的两个
      if (completed.length >= 2) {
        setAId((prev) => prev ?? completed[0].id);
        setBId((prev) => prev ?? completed[1].id);
      } else if (completed.length === 1) {
        setAId(completed[0].id);
      }
    } catch (err: any) {
      message.error(`加载失败:${err?.message ?? ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId]);

  const taskA = useMemo(() => tasks.find((t) => t.id === aId) ?? null, [tasks, aId]);
  const taskB = useMemo(() => tasks.find((t) => t.id === bId) ?? null, [tasks, bId]);
  const versionA = toVersionConfig(taskA, '版本 A');
  const versionB = toVersionConfig(taskB, '版本 B');
  const metrics = buildMetrics(taskA, taskB);

  const taskOptions = tasks.map((t) => ({
    value: t.id,
    label: `${t.title} · ${new Date(t.createdAt).toLocaleString()}`,
  }));

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <Space>
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>A/B 对比评测</Title>
          <Tag color="blue" style={{ borderRadius: 20 }}>真实任务对比</Tag>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />}>新建对比</Button>
        </Space>
      </div>

      {/* 任务选择器 */}
      <GlassPanel variant="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <Space size="large" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ flex: 1 }}>
            <Tag color="blue">A</Tag>
            <Select
              placeholder="选择任务 A"
              style={{ minWidth: 280 }}
              options={taskOptions}
              value={aId ?? undefined}
              onChange={setAId}
              showSearch
              optionFilterProp="label"
            />
          </Space>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ flex: 1 }}>
            <Tag color="green">B</Tag>
            <Select
              placeholder="选择任务 B"
              style={{ minWidth: 280 }}
              options={taskOptions}
              value={bId ?? undefined}
              onChange={setBId}
              showSearch
              optionFilterProp="label"
            />
          </Space>
        </Space>
      </GlassPanel>

      <Spin spinning={loading}>
        {tasks.length === 0 ? (
          <GlassPanel variant="card" style={{ padding: 60, textAlign: 'center' }}>
            <Empty description="该空间下暂无已完成的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </GlassPanel>
        ) : taskA && taskB ? (
          <>
            <GlassPanel variant="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
              <ComparePlayer versionA={versionA} versionB={versionB} />
            </GlassPanel>

            <CompareMetrics metrics={metrics} />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--spacing-lg)', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <Button type="primary" block={isMobile}>采用版本 A</Button>
              <Button block={isMobile}>采用版本 B</Button>
              <Button block={isMobile}>另存为模板</Button>
              <Button block={isMobile}>导出报告</Button>
            </div>
          </>
        ) : (
          <GlassPanel variant="card" style={{ padding: 60, textAlign: 'center' }}>
            <Empty description="请在上方选择两个已完成任务进行对比" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </GlassPanel>
        )}
      </Spin>
    </div>
  );
}

export default AbComparePage;
