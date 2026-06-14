import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import authService from '../../services/auth.service';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      toast.success('Reset link sent if email exists');
    } catch (err: any) {
      console.error(err);
      // Still show success page to avoid user enumeration attacks as per best practices
      setSuccess(true);
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
          <h2 className="text-2xl font-bold tracking-wide">Recover Password</h2>
          <p className="text-xs text-surface-200 mt-1 font-light text-center">
            Enter your email to receive a password reset link
          </p>
        </div>

        {success ? (
          <div className="text-center animate-fade-in">
            <p className="text-sm text-surface-200 leading-relaxed font-light mb-6">
              If an account is associated with <span className="font-semibold text-white">{email}</span>, 
              you will receive a link to reset your password shortly.
            </p>
            <Link to="/login">
              <Button variant="primary" className="w-full h-11 text-sm font-semibold">
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              disabled={loading}
              required
            />

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2 h-11 text-sm font-semibold">
              Send Reset Link
            </Button>

            <Link to="/login" className="block text-center mt-2 text-xs text-surface-200 hover:text-white transition-colors font-medium">
              Cancel and go back
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
