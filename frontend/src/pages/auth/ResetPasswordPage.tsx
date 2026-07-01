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
    <div className="min-h-screen bg-canvas-default text-fg-default flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-canvas-default border border-default rounded-lg shadow-elevation-medium overflow-hidden p-8 animate-fade-in">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-accent-subtle text-accent-emphasis rounded-lg w-fit mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold">Set New Password</h2>
          <p className="text-xs text-fg-muted mt-1 text-center">
            Create a secure new password for your account
          </p>
        </div>

        {!token ? (
          <div className="text-center text-danger-fg text-xs font-semibold py-4">
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
