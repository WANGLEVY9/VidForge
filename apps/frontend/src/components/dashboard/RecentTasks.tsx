import React from 'react';
import { List, Typography, Tag, Space, Button, Progress, Tooltip, Empty, Skeleton } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { GlassPanel } from '../studio/GlassPanel';
import { StudioHeader } from '../studio/StudioHeader';
import { type CreationTask } from '../../services/creation';

const { Text } = Typography;

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  processing: { color: 'processing', text: '生成中', icon: <SyncOutlined spin /> },
  failed: { color: 'error', text: '失败', icon: <ClockCircleOutlined /> },
  pending: { color: 'default', text: '排队中', icon: <ClockCircleOutlined /> },
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface RecentTasksProps {
  tasks: CreationTask[];
  loading?: boolean;
}

export const RecentTasks: React.FC<RecentTasksProps> = React.memo(function RecentTasks({
  tasks,
  loading = false,
}) {
  if (loading) {
    return (
      <GlassPanel variant="card">
        <StudioHeader title="最近创作" icon={<ClockCircleOutlined />} />
        <div style={{ padding: 'var(--spacing-lg)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} active avatar paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
          ))}
        </div>
      </GlassPanel>
    );
  }

  if (tasks.length === 0) {
    return (
      <GlassPanel variant="card">
        <StudioHeader title="最近创作" icon={<ClockCircleOutlined />} />
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无任务记录，去「视频创作」页面发起一次生成吧"
          style={{ padding: 'var(--spacing-xxxl) 0', color: 'var(--text-tertiary)' }}
        />
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="card">
      <StudioHeader
        title="最近创作"
        icon={<ClockCircleOutlined />}
        extra={
          <Button type="link" icon={<RightOutlined />} style={{ color: 'var(--brand-primary)' }}>
            查看全部
          </Button>
        }
      />
      <List
        dataSource={tasks.slice(0, 8)}
        renderItem={(task) => {
          const st = statusMap[task.status] ?? statusMap.pending;
          const totalDuration = task.result?.duration as number | undefined;
          return (
            <List.Item
              style={{
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              actions={
                [
                  task.status === 'completed' && task.result?.url ? (
                    <Tooltip title="预览视频" key="preview">
                      <Button
                        type="text"
                        icon={<PlayCircleOutlined />}
                        style={{ color: 'var(--brand-primary)' }}
                        onClick={() => window.open(task.result.url, '_blank')}
                      />
                    </Tooltip>
                  ) : null,
                ].filter(Boolean) as any[]
              }
            >
              <List.Item.Meta
                avatar={
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background:
                        task.status === 'completed'
                          ? '#10b981'
                          : task.status === 'processing'
                            ? '#6366f1'
                            : task.status === 'failed'
                              ? '#ef4444'
                              : 'var(--text-tertiary)',
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                }
                title={
                  <Space>
                    <Text strong style={{ color: 'var(--text-primary)' }}>
                      {task.title}
                    </Text>
                    <Tag color={st.color} icon={st.icon} style={{ borderRadius: 20, fontSize: 12 }}>
                      {st.text}
                    </Tag>
                  </Space>
                }
                description={
                  <Space size={16}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {relativeTime(task.createdAt)}
                    </Text>
                    {task.status === 'completed' && totalDuration && (
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        时长 {formatDuration(totalDuration)}
                      </Text>
                    )}
                    {task.status === 'processing' && (
                      <Progress
                        percent={task.progress ?? 0}
                        size="small"
                        style={{ width: 120 }}
                        strokeColor="#6366f1"
                      />
                    )}
                    {task.status === 'failed' && task.errorMessage && (
                      <Text style={{ fontSize: 12, color: '#ef4444' }}>{task.errorMessage}</Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />
    </GlassPanel>
  );
});
