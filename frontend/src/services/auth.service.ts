import apiClient from './api';

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  async register(email: string, password: string, displayName: string) {
    const res = await apiClient.post('/auth/register', { email, password, displayName });
    return res.data;
  },

  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  async refreshToken() {
    const res = await apiClient.post('/auth/refresh');
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, passwordSecret: string) {
    const res = await apiClient.post('/auth/reset-password', { token, passwordSecret });
    return res.data;
  },

  async verifyEmail(token: string) {
    const res = await apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return res.data;
  },
};

export default authService;
