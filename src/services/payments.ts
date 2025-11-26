import api from '@/lib/api';

export const fetchPayments = async () => {
  const response = await api.get('/payments/');
  // The backend already filters data based on the user's role (Admin/Leader/Member)
  return response.data;
};

export const createPayment = async (paymentData: any) => {
  // Ensure `user` is sent as a numeric id (DRF accepts either, but keep payload consistent)
  const payload = { ...paymentData };
  if (payload.user && typeof payload.user === 'string') {
    const n = Number(payload.user);
    payload.user = Number.isNaN(n) ? payload.user : n;
  }
  
  // Ensure user is always sent as a number
  if (typeof payload.user === 'string') {
    payload.user = parseInt(payload.user, 10);
  }
  
  // Ensure transaction_type is properly set
  if (!payload.transaction_type) {
    payload.transaction_type = 'COLLECT'; // Default to collection
  }

  const response = await api.post('/payments/', payload);
  return response.data;
};

export const updatePayment = async (paymentId: string, paymentData: any) => {
  // Ensure `user` is sent as a numeric id (DRF accepts either, but keep payload consistent)
  const payload = { ...paymentData };
  if (payload.user && typeof payload.user === 'string') {
    const n = Number(payload.user);
    payload.user = Number.isNaN(n) ? payload.user : n;
  }
  
  // Ensure user is always sent as a number
  if (typeof payload.user === 'string') {
    payload.user = parseInt(payload.user, 10);
  }
  
  // Ensure transaction_type is properly set
  if (!payload.transaction_type) {
    payload.transaction_type = 'COLLECT'; // Default to collection
  }
  
  const response = await api.patch(`/payments/${paymentId}/`, payload);
  return response.data;
};

export const deletePayment = async (paymentId: string) => {
  const response = await api.delete(`/payments/${paymentId}/`);
  // DRF usually returns 204 No Content for deletes. Normalize to a predictable value.
  if (response.status === 204) return { success: true };
  return response.data;
};

// We also need to fetch users to populate the "Select Member" dropdown
// The backend automatically filters this list based on who is asking
export const fetchAvailableMembers = async () => {
  const response = await api.get('/users/');
  return response.data;
};