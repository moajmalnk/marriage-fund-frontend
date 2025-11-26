import api from '@/lib/api';

// Fetch all requests (Backend filters based on user role automatically)
export const fetchFundRequests = async () => {
  const response = await api.get('/fund-requests/');
  return response.data;
};

// Create a new request
export const createFundRequest = async (data: { amount: number; reason: string; detailed_reason: string }) => {
  const response = await api.post('/fund-requests/', data);
  return response.data;
};

// Approve a request (Only for Admins)
export const approveFundRequest = async ({ id, paymentDate }: { id: string; paymentDate: string }) => {
  // Backend expects 'payment_date' in snake_case
  const response = await api.post(`/fund-requests/${id}/approve/`, { 
    payment_date: paymentDate 
  });
  return response.data;
};

// Decline a request (Only for Admins)
export const declineFundRequest = async ({ id, reason }: { id: string; reason: string }) => {
  const response = await api.post(`/fund-requests/${id}/decline/`, { 
    reason 
  });
  return response.data;
};