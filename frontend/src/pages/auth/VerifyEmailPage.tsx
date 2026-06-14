import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, MailX } from 'lucide-react';
import authService from '../../services/auth.service';
import Spinner from '../../components/shared/Spinner';
import Button from '../../components/shared/Button';

export function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const triggeredRef = useRef(false);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Verification token is missing.');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Email verification failed. The token may be invalid or expired.');
      }
    }

    if (!triggeredRef.current) {
      triggeredRef.current = true;
      verify();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface-800 border border-surface-border rounded-2xl shadow-xl overflow-hidden glass p-8 z-10 text-center animate-fade-in">
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Spinner size="lg" className="mb-4" />
            <h2 className="text-xl font-bold tracking-wide">Verifying Your Email</h2>
            <p className="text-xs text-surface-200 mt-2 font-light">
              Checking token parameters...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <div className="p-4 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full w-fit mx-auto mb-6">
              <MailCheck className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold tracking-wide">Email Verified!</h2>
            <p className="text-sm text-surface-200 mt-4 leading-relaxed font-light">
              Thank you for verifying your email address. Your account is now fully active.
            </p>
            <Link to="/login" className="block mt-8">
              <Button variant="primary" className="w-full h-11 text-sm font-semibold">
                Proceed to Sign In
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
            <div className="p-4 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full w-fit mx-auto mb-6">
              <MailX className="w-10 h-10 text-error" />
            </div>
            <h2 className="text-2xl font-bold tracking-wide">Verification Failed</h2>
            <p className="text-sm text-error mt-4 leading-relaxed font-semibold">
              {errorMessage}
            </p>
            <p className="text-xs text-surface-200 mt-2 leading-relaxed font-light">
              Please check the link in your email and try again.
            </p>
            <Link to="/login" className="block mt-8">
              <Button variant="secondary" className="w-full h-11 text-sm font-semibold border-surface-border">
                Back to Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
