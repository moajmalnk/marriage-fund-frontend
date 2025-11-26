import api from '@/lib/api';

export const fetchNotifications = async () => {
  const response = await api.get('/notifications/');
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.post(`/notifications/${id}/mark_read/`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post(`/notifications/mark_all_read/`);
  return response.data;
};

export const deleteNotification = async (id: string) => {
  const response = await api.delete(`/notifications/${id}/`);
  return response.data;
};