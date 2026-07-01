import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
// Applies the resolved theme (persisted override or OS preference) to <html data-theme> as a
// module-load side effect — must run before render to avoid a flash of the wrong theme.
import './stores/themeStore';

if (import.meta.env.DEV) {
  // Dev-only console hook so protected pages (Dashboard/Settings) can be viewed without a
  // running backend — never included in production builds.
  import('./stores/authStore').then(({ useAuthStore }) => {
    (window as any).fakeLogin = () =>
      useAuthStore.getState().setAuth(
        {
          id: 'dev-preview',
          email: 'preview@local.dev',
          display_name: 'Preview User',
          avatar_url: null,
          github_username: null,
          role: 'user',
          email_verified: true,
          created_at: new Date().toISOString(),
        },
        'dev-preview-token'
      );
    console.info('[dev] Run fakeLogin() in this console to preview Dashboard/Settings without a backend.');
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    1000 * 60 * 2,  // 2 min
      retry:        1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:   'var(--color-canvas-default)',
              color:        'var(--color-fg-default)',
              border:       '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-medium)',
              boxShadow:    'var(--shadow-medium)',
              fontFamily:   'inherit',
              fontSize:     '14px',
            },
            success: { iconTheme: { primary: 'var(--color-success-emphasis)', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: 'var(--color-danger-emphasis)', secondary: '#ffffff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
