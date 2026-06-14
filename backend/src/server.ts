import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { testConnection as testDb } from './config/db';
import { testConnection as testRedis } from './config/redis';
import { attachWebSocketServer } from './websocket/ws-server';

const PORT = parseInt(process.env.API_PORT || '4000', 10);

async function start(): Promise<void> {
  // Verify all service connections before accepting traffic
  await testDb();
  await testRedis();

  const app = createApp();
  const server = http.createServer(app);
  
  // Attach real-time WS connection handler
  attachWebSocketServer(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Git Analyser API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
    console.log(`   Env:    ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
