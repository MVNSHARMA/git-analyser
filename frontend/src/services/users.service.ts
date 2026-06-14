import apiClient from './api';
import { User } from '../stores/authStore';

export const usersService = {
  async getProfile(): Promise<User> {
    const res = await apiClient.get('/users/me');
    return res.data;
  },

  async updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<User> {
    const res = await apiClient.patch('/users/me', updates);
    return res.data;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  },
};

export default usersService;
