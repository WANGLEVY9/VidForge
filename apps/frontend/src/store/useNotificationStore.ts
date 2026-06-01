import { create } from 'zustand';
import { notificationApi, NotificationItem } from '../services/notification';

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface NotificationActions {
  fetch: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loaded: false,
  loading: false,
  error: null,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  async fetch() {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [list, unread] = await Promise.all([
        notificationApi.list({ pageSize: 50 }),
        notificationApi.unreadCount(),
      ]);
      set({
        items: list.items,
        unreadCount: unread.count,
        loaded: true,
        loading: false,
      });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message ?? '加载通知失败',
      });
    }
  },

  async refreshUnreadCount() {
    try {
      const { count } = await notificationApi.unreadCount();
      // 只有当未读数发生变化时才主动重新拉取列表
      if (count !== get().unreadCount) {
        set({ unreadCount: count });
        // 静默重拉一次列表(不阻塞)
        notificationApi
          .list({ pageSize: 50 })
          .then((list) => set({ items: list.items }))
          .catch(() => {});
      }
    } catch {
      // 后台轮询失败静默忽略
    }
  },

  async markRead(id: string) {
    const items = get().items;
    const target = items.find((it) => it.id === id);
    if (!target || target.read || target.userId === null) return;
    // 乐观更新
    set({
      items: items.map((it) => (it.id === id ? { ...it, read: true } : it)),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await notificationApi.markRead(id);
    } catch {
      // 失败时回滚
      set({ items });
      get().refreshUnreadCount();
    }
  },

  async markAllRead() {
    const items = get().items;
    const prevCount = get().unreadCount;
    set({
      items: items.map((it) =>
        it.userId !== null ? { ...it, read: true } : it,
      ),
      unreadCount: 0,
    });
    try {
      await notificationApi.markAllRead();
    } catch {
      set({ items, unreadCount: prevCount });
    }
  },

  async remove(id: string) {
    const items = get().items;
    const target = items.find((it) => it.id === id);
    if (!target) return;
    if (target.userId === null) return; // 广播不可删
    set({
      items: items.filter((it) => it.id !== id),
      unreadCount: target.read
        ? get().unreadCount
        : Math.max(0, get().unreadCount - 1),
    });
    try {
      await notificationApi.remove(id);
    } catch {
      set({ items });
      get().refreshUnreadCount();
    }
  },

  reset() {
    set(initialState);
  },
}));
