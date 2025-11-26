import api from '@/lib/api';

// Get the API base URL to properly construct media URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Function to fix profile photo URLs
const fixProfilePhotoUrl = (user: any) => {
  if (user && user.profile_photo && user.profile_photo.startsWith('/media/')) {
    // Prepend the backend base URL to make it a full URL
    return {
      ...user,
      profile_photo: `${BACKEND_BASE_URL}${user.profile_photo}`
    };
  }
  return user;
};

// Fix profile photo URLs for multiple users
const fixProfilePhotoUrls = (users: any[]) => {
  return users.map(user => fixProfilePhotoUrl(user));
};

// Fetch all users (Restricted by role)
export const fetchUsers = async () => {
  const response = await api.get('/users/');
  return fixProfilePhotoUrls(response.data);
};

// NEW: Fetch ALL users for public lists (like Terms Acknowledgement)
export const fetchAllUsersPublic = async () => {
  const response = await api.get('/users/all_public/');
  return fixProfilePhotoUrls(response.data);
};

// Fetch members assigned to the current responsible member
export const fetchMyMembers = async () => {
  const response = await api.get('/users/my_members/');
  return fixProfilePhotoUrls(response.data);
};

export const createUser = async (userData: FormData | any) => {
  const response = await api.post('/users/', userData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return fixProfilePhotoUrl(response.data);
};

export const updateUser = async ({ id, data }: { id: string; data: FormData | any }) => {
  const response = await api.patch(`/users/${id}/`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return fixProfilePhotoUrl(response.data);
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