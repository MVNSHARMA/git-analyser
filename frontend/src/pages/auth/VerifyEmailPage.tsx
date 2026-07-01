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
    <div className="min-h-screen bg-canvas-default text-fg-default flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-canvas-default border border-muted rounded-lg shadow-elevation-medium overflow-hidden p-8 text-center animate-fade-in">
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Spinner size="lg" className="mb-4" />
            <h2 className="text-xl font-semibold">Verifying Your Email</h2>
            <p className="text-xs text-fg-muted mt-2">
              Checking token parameters...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <div className="p-4 bg-success-fg/10 rounded-full w-fit mx-auto mb-6">
              <MailCheck className="w-10 h-10 text-success-fg" />
            </div>
            <h2 className="text-2xl font-semibold">Email Verified!</h2>
            <p className="text-sm text-fg-muted mt-4 leading-relaxed">
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
            <div className="p-4 bg-danger-fg/10 rounded-full w-fit mx-auto mb-6">
              <MailX className="w-10 h-10 text-danger-fg" />
            </div>
            <h2 className="text-2xl font-semibold">Verification Failed</h2>
            <p className="text-sm text-danger-fg mt-4 leading-relaxed font-medium">
              {errorMessage}
            </p>
            <p className="text-xs text-fg-muted mt-2 leading-relaxed">
              Please check the link in your email and try again.
            </p>
            <Link to="/login" className="block mt-8">
              <Button variant="secondary" className="w-full h-11 text-sm font-semibold">
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
