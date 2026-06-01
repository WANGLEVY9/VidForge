import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Empty,
  Popover,
  Space,
  Spin,
  Tabs,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  NotificationItem,
  NotificationType,
} from '../../services/notification';

const { Text } = Typography;

const POLL_INTERVAL_MS = 60_000;

const TYPE_META: Record<
  NotificationType,
  { color: string; icon: React.ReactNode; label: string }
> = {
  system: { color: '#3b82f6', icon: <RocketOutlined />, label: '系统' },
  task: { color: '#10b981', icon: <CheckOutlined />, label: '任务' },
  compliance: { color: '#f59e0b', icon: <SafetyOutlined />, label: '合规' },
  tip: { color: '#a855f7', icon: <BulbOutlined />, label: '提示' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const t = new Date(dateStr).getTime();
  const diff = Math.max(0, now - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

interface NotificationRowProps {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
  onRemove: (id: string) => void;
}

function NotificationRow({ item, onClick, onRemove }: NotificationRowProps) {
  const meta = TYPE_META[item.type] ?? TYPE_META.system;
  const isBroadcast = item.userId === null;
  const unread = !isBroadcast && !item.read;

  return (
    <div
      onClick={() => onClick(item)}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: unread ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
        border: `1px solid ${unread ? 'rgba(99,102,241,0.18)' : 'var(--border-color)'}`,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        marginBottom: 8,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = unread
          ? 'rgba(99, 102, 241, 0.06)'
          : 'transparent';
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: '50%',
          background: `${meta.color}1A`,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2,
          }}
        >
          <Text
            strong
            style={{
              fontSize: 13,
              color: 'var(--text-primary)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Text>
          {isBroadcast && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                flexShrink: 0,
              }}
            >
              广播
            </span>
          )}
          {unread && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ef4444',
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <Text
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.content}
        </Text>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--text-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{formatRelativeTime(item.createdAt)}</span>
          {!isBroadcast && (
            <Tooltip title="删除">
              <CloseOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                style={{ cursor: 'pointer' }}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const loaded = useNotificationStore((s) => s.loaded);
  const fetchAll = useNotificationStore((s) => s.fetch);
  const refreshUnread = useNotificationStore((s) => s.refreshUnreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const removeOne = useNotificationStore((s) => s.remove);

  // 启动时拉一次,然后定时轮询未读数
  useEffect(() => {
    fetchAll();
    const timer = window.setInterval(() => {
      refreshUnread();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchAll, refreshUnread]);

  // 打开 Popover 时刷新一次列表
  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  const filtered = useMemo(() => {
    if (tab === 'unread') {
      // 广播 + 未读 personal
      return items.filter((it) => it.userId === null || !it.read);
    }
    return items;
  }, [items, tab]);

  const handleItemClick = async (item: NotificationItem) => {
    if (item.userId !== null && !item.read) {
      await markRead(item.id);
    }
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    message.success('已全部标记为已读');
  };

  const content = (
    <div
      style={{
        width: 380,
        maxHeight: 520,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 12px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          通知中心
        </Text>
        <Space size={4}>
          <Button
            type="text"
            size="small"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            全部已读
          </Button>
        </Space>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'all' | 'unread')}
        size="small"
        style={{ padding: '0 12px' }}
        items={[
          { key: 'all', label: `全部 (${items.length})` },
          { key: 'unread', label: `未读 (${unreadCount})` },
        ]}
      />
      <div
        style={{
          padding: '4px 12px 12px',
          overflowY: 'auto',
          flex: 1,
          maxHeight: 380,
        }}
      >
        {loading && !loaded ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {tab === 'unread' ? '没有未读通知' : '暂无通知'}
              </span>
            }
            style={{ padding: '24px 0' }}
          />
        ) : (
          filtered.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onClick={handleItemClick}
              onRemove={removeOne}
            />
          ))
        )}
      </div>
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-color)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          广播消息不计入未读
        </span>
        <span>每 {POLL_INTERVAL_MS / 1000}s 自动刷新</span>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayStyle={{ paddingTop: 4 }}
      overlayInnerStyle={{
        padding: 0,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      <Tooltip title={open ? '' : '通知'} placement="bottom">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          />
        </Badge>
      </Tooltip>
    </Popover>
  );
}
