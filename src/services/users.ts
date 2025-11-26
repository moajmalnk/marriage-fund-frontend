import api from '@/lib/api';

// Fetch all users (Restricted by role)
export const fetchUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

// NEW: Fetch ALL users for public lists (like Terms Acknowledgement)
export const fetchAllUsersPublic = async () => {
  const response = await api.get('/users/all_public/');
  return response.data;
};

// Fetch members assigned to the current responsible member
export const fetchMyMembers = async () => {
  const response = await api.get('/users/my_members/');
  return response.data;
};

export const createUser = async (userData: FormData | any) => {
  const response = await api.post('/users/', userData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateUser = async ({ id, data }: { id: string; data: FormData | any }) => {
  const response = await api.patch(`/users/${id}/`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Delete a user
export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}/`);
  return response.data;
};

export const acknowledgeTerms = async () => {
  const response = await api.post('/terms/', {
    user_agent: navigator.userAgent
  });
  return response.data;
};