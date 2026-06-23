import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Terminal, Github, Mail } from 'lucide-react';
import authService from '../../services/auth.service';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

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
      <div className="min-h-screen bg-white text-[#111827] flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#DAA144] z-20" />
        <div className="w-full max-w-md bg-white border-[3px] border-[#111827] p-8 z-10 text-center animate-fade-in">
          <div className="p-4 bg-white border-2 border-[#111827] w-fit mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#DAA144] animate-bounce" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-wide">Check Your Email</h2>
          <p className="text-sm text-gray-700 mt-4 leading-relaxed font-light">
            We have sent a verification link to <span className="font-extrabold text-[#111827]">{email}</span>.
            Please verify your email address to complete your registration.
          </p>
          <Link to="/login" className="block mt-8">
            <Button variant="primary" className="w-full h-12 text-sm font-black tracking-widest">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111827] flex items-center justify-center p-6 relative">
      {/* Thick accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#DAA144] z-20" />

      <div className="w-full max-w-md bg-white border-[3px] border-[#111827] p-8 z-10 text-[#111827]">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-white border-2 border-[#111827] text-[#111827] rounded-none w-fit mb-4">
            <Terminal className="w-8 h-8 text-[#DAA144]" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-wide text-[#111827]">Create Account</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1.5 font-bold">
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

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-4 h-12 text-sm font-black tracking-widest">
            Create Account
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
          Sign up with GitHub
        </Button>

        {/* Redirect Link */}
        <p className="text-xs text-gray-600 text-center mt-8 font-bold uppercase tracking-wide">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#DAA144] hover:underline font-black transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
