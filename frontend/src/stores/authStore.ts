import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  github_username: string | null;
  role: string;
  email_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string | null) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

// Extract initial refresh token from URL if redirected (e.g. from GitHub login callback in production)
const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const initialRefreshToken = urlParams.get('refreshToken');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: initialRefreshToken,
  isAuthenticated: false,
  isLoading: true, // starts loading to allow silent token refresh checks
  setAuth: (user, accessToken, refreshToken = null) =>
    set((state) => ({
      user,
      accessToken,
      refreshToken: refreshToken || state.refreshToken || initialRefreshToken,
      isAuthenticated: true,
      isLoading: false,
    })),
  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
}));
