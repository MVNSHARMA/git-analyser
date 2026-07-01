import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: false,
    hmr: {
      overlay: false,
    },
    // Docker Desktop on Windows doesn't reliably propagate native filesystem change events
    // through the bind mount (./frontend:/app) into the container's inotify watcher, so Vite
    // never sees host-side edits without polling.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
