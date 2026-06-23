import apiClient from './api';

export function setStoredRefreshToken(token: string) {
  localStorage.setItem('rt', token);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('rt');
}

export async function refreshToken() {
  const rt = localStorage.getItem('rt');
  return apiClient.post('/auth/refresh', { refreshToken: rt });
}

// Extract initial refresh token from URL if redirected (e.g. from GitHub login callback in production)
const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
if (urlParams.has('refreshToken')) {
  const token = urlParams.get('refreshToken');
  if (token) {
    localStorage.setItem('rt', token);
  }
}

// Clear the query parameter from the URL address bar immediately to keep it clean
if (typeof window !== 'undefined' && urlParams.has('refreshToken')) {
  const newUrl = window.location.pathname + window.location.hash;
  window.history.replaceState({}, document.title, newUrl);
}

export const authService = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    const data = response.data;
    if (data.refreshToken) {
      localStorage.setItem('rt', data.refreshToken);
    }
    return data;
  },

  async register(email: string, password: string, displayName: string) {
    const res = await apiClient.post('/auth/register', { email, password, displayName });
    return res.data;
  },

  async logout() {
    localStorage.removeItem('rt');
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  refreshToken,

  async forgotPassword(email: string) {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, passwordSecret: string) {
    const res = await apiClient.post('/auth/reset-password', { token, passwordSecret });
    if (res.data?.refreshToken) {
      localStorage.setItem('rt', res.data.refreshToken);
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
  return localStorage.getItem('rt');
}

export function setInMemoryRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('rt', token);
  } else {
    localStorage.removeItem('rt');
  }
}

export default authService;
