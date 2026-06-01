import apiClient from '../utils/api';

export type NotificationType = 'system' | 'task' | 'compliance' | 'tip';

export interface NotificationItem {
  id: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResp {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const notificationApi = {
  list(params?: { page?: number; pageSize?: number; unread?: boolean }) {
    return apiClient.get<any, NotificationListResp>('/notifications', {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 50,
        unread: params?.unread ? 'true' : undefined,
      },
    });
  },
  unreadCount() {
    return apiClient.get<any, { count: number }>('/notifications/unread-count');
  },
  markRead(id: string) {
    return apiClient.post<any, NotificationItem>(`/notifications/${id}/read`);
  },
  markAllRead() {
    return apiClient.post<any, { updated: number }>('/notifications/read-all');
  },
  remove(id: string) {
    return apiClient.delete<any, { ok: boolean }>(`/notifications/${id}`);
  },
};
