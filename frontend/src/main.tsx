import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

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
              background: '#1a1d2e',
              color:      '#f0f2ff',
              border:     '1px solid #2a2d42',
              fontFamily: 'Inter, sans-serif',
              fontSize:   '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1d2e' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1d2e' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
