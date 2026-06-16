import apiClient from './api';

// Extract initial refresh token from URL if redirected (e.g. from GitHub login callback in production)
const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
let inMemoryRefreshToken: string | null = urlParams.get('refreshToken');

// Clear the query parameter from the URL address bar immediately to keep it clean
if (typeof window !== 'undefined' && urlParams.has('refreshToken')) {
  const newUrl = window.location.pathname + window.location.hash;
  window.history.replaceState({}, document.title, newUrl);
}

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.data?.refreshToken) {
      inMemoryRefreshToken = res.data.refreshToken;
    }
    return res.data;
  },

  async register(email: string, password: string, displayName: string) {
    const res = await apiClient.post('/auth/register', { email, password, displayName });
    return res.data;
  },

  async logout() {
    inMemoryRefreshToken = null;
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  async refreshToken() {
    const body = inMemoryRefreshToken ? { refreshToken: inMemoryRefreshToken } : {};
    const res = await apiClient.post('/auth/refresh', body);
    if (res.data?.refreshToken) {
      inMemoryRefreshToken = res.data.refreshToken;
    }
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, passwordSecret: string) {
    const res = await apiClient.post('/auth/reset-password', { token, passwordSecret });
    if (res.data?.refreshToken) {
      inMemoryRefreshToken = res.data.refreshToken;
    }
    return res.data;
  },

  async verifyEmail(token: string) {
    const res = await apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return res.data;
  },
};

// Export helpers for api client/interceptor to prevent circular dependencies
export function getInMemoryRefreshToken() {
  return inMemoryRefreshToken;
}

export function setInMemoryRefreshToken(token: string | null) {
  inMemoryRefreshToken = token;
}

export default authService;
