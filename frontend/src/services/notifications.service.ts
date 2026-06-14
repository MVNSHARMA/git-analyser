import apiClient from './api';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  repo_id: string | null;
  created_at: string;
}

export const notificationsService = {
  async getNotifications(unread?: boolean): Promise<Notification[]> {
    const res = await apiClient.get('/notifications', {
      params: { unread },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};

export default notificationsService;
