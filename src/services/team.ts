import api from '@/lib/api';

export const fetchTeamStructure = async () => {
  const response = await api.get('/teams/');
  return response.data;
};

export const fetchAllUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

export const createUser = async (userData: any) => {
  const response = await api.post('/users/', userData);
  return response.data;
};

export const updateUser = async ({ id, data }: { id: string; data: any }) => {
  const response = await api.patch(`/users/${id}/`, data);
  return response.data;
};