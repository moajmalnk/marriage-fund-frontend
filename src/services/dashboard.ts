import api from '@/lib/api';

export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard/stats/');
  return response.data;
};

export const fetchRecentRequests = async () => {
  const response = await api.get('/fund-requests/');
  // Sort by date descending and take top 5
  return response.data
    .sort((a: any, b: any) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime())
    .slice(0, 5);
};

// We will add this endpoint to Django later, for now we return empty to keep UI valid
export const fetchNotifications = async () => {
  return []; 
};