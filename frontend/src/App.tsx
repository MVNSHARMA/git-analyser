import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import useIndexingProgress from './hooks/useIndexingProgress';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Pages
import LandingPage from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import CallbackPage from './pages/auth/CallbackPage';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

export default function App() {
  // Restore session silently on mount/load
  useAuth();

  // Listen to WebSocket indexing status events globally
  useIndexingProgress();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/"                element={<LandingPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />
      <Route path="/auth/callback"   element={<CallbackPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/repo/:repoId/chat"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/repo/:repoId/chat/:convId"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallbacks */}
      <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
