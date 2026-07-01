import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Terminal, Github } from 'lucide-react';
import authService from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import ThemeToggle from '../../components/shared/ThemeToggle';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    ? 'https://git-analyser-production.up.railway.app'
    : 'http://localhost:4000');

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { setAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = 'Invalid email address';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setAuth(data.user, data.accessToken);
      toast.success('Logged in successfully');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = `${BASE_URL}/api/v1/auth/github`;
  };

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default flex items-center justify-center p-6 relative">
      {/* Thin accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent-emphasis z-20" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-canvas-default border border-default rounded-lg shadow-elevation-medium p-8 z-10 text-fg-default">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-canvas-subtle border border-default rounded-lg text-accent-emphasis w-fit mb-4">
            <Terminal className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-semibold text-fg-default">Sign In</h2>
          <p className="text-sm text-fg-muted mt-1.5">
            Sign in to access your Git Analyser dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={loading}
            required
          />

          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-fg-default">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-accent-emphasis hover:underline transition-colors font-medium"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas-default border border-default rounded-md text-fg-default placeholder-fg-subtle focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis transition-colors"
              disabled={loading}
              required
            />
            {errors.password && (
              <span className="text-xs text-danger-fg font-medium mt-1.5 animate-fade-in">
                {errors.password}
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-4 h-11 text-sm font-semibold">
            Sign In
          </Button>
        </form>

        {/* Separator */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-default" />
          <span className="absolute bg-canvas-default px-4 text-xs font-medium text-fg-muted">
            Or
          </span>
        </div>

        {/* Social */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleGithubLogin}
          disabled={loading}
          className="w-full h-11 text-sm font-semibold"
        >
          <Github className="w-5 h-5 mr-3" />
          Continue with GitHub
        </Button>

        {/* Redirect Link */}
        <p className="text-sm text-fg-muted text-center mt-8">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-accent-emphasis hover:underline font-semibold transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
