import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Terminal, Github } from 'lucide-react';
import authService from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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
    <div className="min-h-screen bg-white text-[#111827] flex items-center justify-center p-6 relative">
      {/* Thick accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#DD614C] z-20" />

      <div className="w-full max-w-md bg-white border-[3px] border-[#111827] p-8 z-10 text-[#111827]">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-white border-2 border-[#111827] text-[#111827] rounded-none w-fit mb-4">
            <Terminal className="w-8 h-8 text-[#DD614C]" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-wide text-[#111827]">Sign In</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1.5 font-bold">
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
              <label className="text-sm font-black text-[#111827] uppercase tracking-widest">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#DD614C] hover:underline transition-colors font-bold uppercase tracking-wider"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 bg-white border-2 border-[#111827] text-[#111827] placeholder-gray-500 focus:outline-none focus:border-[3px] focus:border-[#DD614C] transition-all`}
              disabled={loading}
              required
            />
            {errors.password && (
              <span className="text-xs text-error font-extrabold mt-1.5 animate-fade-in">
                {errors.password}
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-4 h-12 text-sm font-black tracking-widest">
            Sign In
          </Button>
        </form>

        {/* Separator */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t-2 border-[#111827]" />
          <span className="absolute bg-white px-4 text-xs uppercase font-black text-[#111827] tracking-widest">
            Or
          </span>
        </div>

        {/* Social */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleGithubLogin}
          disabled={loading}
          className="w-full h-12 text-sm font-black tracking-widest bg-white"
        >
          <Github className="w-5 h-5 mr-3 text-[#111827]" />
          Continue with GitHub
        </Button>

        {/* Redirect Link */}
        <p className="text-xs text-gray-600 text-center mt-8 font-bold uppercase tracking-wide">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-[#DD614C] hover:underline font-black transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
