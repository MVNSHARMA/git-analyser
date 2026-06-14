import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import authService from '../../services/auth.service';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing reset token');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password updated successfully');
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to reset password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface-800 border border-surface-border rounded-2xl shadow-xl overflow-hidden glass p-8 z-10 animate-fade-in">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-2xl w-fit mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide">Set New Password</h2>
          <p className="text-xs text-surface-200 mt-1 font-light text-center">
            Create a secure new password for your account
          </p>
        </div>

        {!token ? (
          <div className="text-center text-error text-xs font-semibold py-4">
            Error: Reset token is missing. Please initiate recovery again.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={loading}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={loading}
              required
            />

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2 h-11 text-sm font-semibold">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
