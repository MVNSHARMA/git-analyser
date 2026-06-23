import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getStoredRefreshToken, setStoredRefreshToken } from '../services/auth.service';
import apiClient from '../services/api';

export function useAuth() {
  const { user, accessToken, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        setLoading(true);
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) {
          clearAuth();
          setLoading(false);
          return;
        }
        // call refresh with token in body
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        if (active) {
          const data = response.data;
          if (data.refreshToken) {
            setStoredRefreshToken(data.refreshToken);
          }
          setAuth(data.user, data.accessToken, data.refreshToken);
        }
      } catch (err) {
        if (active) {
          clearAuth();
          setLoading(false);
        }
      }
    }

    if (!isAuthenticated) {
      restoreSession();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, setAuth, clearAuth, setLoading]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
  };
}

export default useAuth;
