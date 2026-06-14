import http from 'http';
import WebSocket from 'ws';
import { verifyAccessToken } from '../services/jwt';
import { query } from '../config/db';
import { createSubscriber } from '../config/redis';

/**
 * Attaches the WebSocket server to the existing HTTP server instance.
 * Performs query-parameter JWT token authentication on socket upgrades.
 */
export function attachWebSocketServer(server: http.Server): void {
  const wss = new WebSocket.Server({ noServer: true });

  // Handle server upgrade request
  server.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        socket.destroy();
        return;
      }

      // Verify token
      const decoded = verifyAccessToken(token);

      // Perform WebSocket handshake
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, decoded);
      });
    } catch {
      socket.destroy();
    }
  });

  // Handle successful connections
  wss.on('connection', async (ws: WebSocket, _req: http.IncomingMessage, decoded: any) => {
    const userId = decoded?.userId;
    if (!userId) {
      ws.close(1008, 'Unauthorised');
      return;
    }

    let subscriber: any = null;

    try {
      // 1. Query all repository IDs owned by this user
      const reposResult = await query<{ id: string }>('SELECT id FROM repositories WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
      const repoIds = reposResult.rows.map((r: { id: string }) => r.id);

      if (repoIds.length > 0) {
        // 2. Create dedicated Redis subscriber
        subscriber = createSubscriber();
        const channels = repoIds.map((id) => `pubsub:repo:${id}`);

        // Subscribe to all channels
        await subscriber.subscribe(...channels);

        // Forward Redis pub/sub messages to WebSockets
        subscriber.on('message', (_channel: string, message: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }

      // Clean up connections on socket close
      ws.on('close', async () => {
        if (subscriber) {
          try {
            await subscriber.unsubscribe();
            await subscriber.quit();
          } catch (err) {
            console.error('Error closing Redis subscriber:', err);
          }
        }
      });
    } catch (err) {
      console.error('Error in WebSocket connection initialization:', err);
      if (subscriber) {
        try {
          await subscriber.quit();
        } catch {}
      }
      ws.close(1011, 'Internal Server Error');
    }
  });
}
