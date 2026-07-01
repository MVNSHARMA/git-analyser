import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Terminal, Github, Mail } from 'lucide-react';
import authService from '../../services/auth.service';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import ThemeToggle from '../../components/shared/ThemeToggle';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    ? 'https://git-analyser-production.up.railway.app'
    : 'http://localhost:4000');

export function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({});

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!displayName) {
      nextErrors.displayName = 'Display name is required';
    } else if (displayName.trim().length < 2) {
      nextErrors.displayName = 'Display name must be at least 2 characters';
    }
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
      await authService.register(email, password, displayName);
      setSuccess(true);
      toast.success('Registration successful');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = `${BASE_URL}/api/v1/auth/github`;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-canvas-default text-fg-default flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent-emphasis z-20" />
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md bg-canvas-default border border-muted rounded-lg shadow-elevation-medium p-8 z-10 text-center animate-fade-in">
          <div className="p-4 bg-canvas-subtle border border-muted rounded-lg w-fit mx-auto mb-6">
            <Mail className="w-10 h-10 text-accent-emphasis animate-bounce" />
          </div>
          <h2 className="text-2xl font-semibold">Check Your Email</h2>
          <p className="text-sm text-fg-muted mt-4 leading-relaxed">
            We have sent a verification link to <span className="font-semibold text-fg-default">{email}</span>.
            Please verify your email address to complete your registration.
          </p>
          <Link to="/login" className="block mt-8">
            <Button variant="primary" className="w-full h-11 text-sm font-semibold">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default flex items-center justify-center p-6 relative">
      {/* Thin accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent-emphasis z-20" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-canvas-default border border-muted rounded-lg shadow-elevation-medium p-8 z-10 text-fg-default">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-canvas-subtle border border-muted rounded-lg text-accent-emphasis w-fit mb-4">
            <Terminal className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-semibold text-fg-default">Create Account</h2>
          <p className="text-sm text-fg-muted mt-1.5">
            Sign up to get started with Git Analyser
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Display Name"
            placeholder="John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            disabled={loading}
            required
          />

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

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
            required
          />

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-4 h-11 text-sm font-semibold">
            Create Account
          </Button>
        </form>

        {/* Separator */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-muted" />
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
          Sign up with GitHub
        </Button>

        {/* Redirect Link */}
        <p className="text-sm text-fg-muted text-center mt-8">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-accent-emphasis hover:underline font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
