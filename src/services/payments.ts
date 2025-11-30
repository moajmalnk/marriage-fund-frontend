import api from '@/lib/api';

export const fetchPayments = async () => {
  const response = await api.get('/payments/');
  // The backend already filters data based on the user's role (Admin/Leader/Member)
  return response.data;
};

export const createPayment = async (paymentData: any) => {
  // Create a clean copy of the data
  const payload = { ...paymentData };
  
  // Ensure transaction_type is properly set
  if (!payload.transaction_type) {
    payload.transaction_type = 'COLLECT'; // Default to collection
  }

  // Handle user ID properly - send as string to let backend handle conversion
  if (payload.user && typeof payload.user !== 'string') {
    payload.user = String(payload.user);
  }
  
  // Handle time format properly
  if (payload.time && typeof payload.time === 'string') {
    // Ensure time is in HH:MM:SS format
    const timeParts = payload.time.split(':');
    if (timeParts.length === 1) {
      // Just hours
      payload.time = `${timeParts[0]}:00:00`;
    } else if (timeParts.length === 2) {
      // Hours and minutes
      payload.time = `${payload.time}:00`;
    }
  }
  
  // Ensure request_id is an integer if present
  if (payload.request_id && typeof payload.request_id === 'string') {
    const requestIdInt = parseInt(payload.request_id, 10);
    if (!isNaN(requestIdInt)) {
      payload.request_id = requestIdInt;
    } else {
      delete payload.request_id; // Remove invalid request_id
    }
  }

  const response = await api.post('/payments/', payload);
  return response.data;
};

export const updatePayment = async (paymentId: string, paymentData: any) => {
  // Create a clean copy of the data
  const payload = { ...paymentData };
  
  // Ensure transaction_type is properly set
  if (!payload.transaction_type) {
    payload.transaction_type = 'COLLECT'; // Default to collection
  }

  // Handle user ID properly - send as string to let backend handle conversion
  if (payload.user && typeof payload.user !== 'string') {
    payload.user = String(payload.user);
  }
  
  // Handle time format properly
  if (payload.time && typeof payload.time === 'string') {
    // Ensure time is in HH:MM:SS format
    const timeParts = payload.time.split(':');
    if (timeParts.length === 1) {
      // Just hours
      payload.time = `${timeParts[0]}:00:00`;
    } else if (timeParts.length === 2) {
      // Hours and minutes
      payload.time = `${payload.time}:00`;
    }
  }
  
  // Ensure request_id is an integer if present
  if (payload.request_id && typeof payload.request_id === 'string') {
    const requestIdInt = parseInt(payload.request_id, 10);
    if (!isNaN(requestIdInt)) {
      payload.request_id = requestIdInt;
    } else {
      delete payload.request_id; // Remove invalid request_id
    }
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