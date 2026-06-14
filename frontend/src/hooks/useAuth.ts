import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';

export function useAuth() {
  const { user, accessToken, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        setLoading(true);
        const data = await authService.refreshToken();
        if (active) {
          setAuth(data.user, data.accessToken);
        }
      } catch (err) {
        if (active) {
          clearAuth();
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
