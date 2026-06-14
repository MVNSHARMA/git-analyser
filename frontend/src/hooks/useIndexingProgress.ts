import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useRepoStore, IndexingStatus } from '../stores/repoStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';

export function useIndexingProgress() {
  const { accessToken } = useAuthStore();
  const { updateIndexingStatus } = useRepoStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    // If no access token is available, don't attempt connection
    if (!accessToken) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Indexing progress WebSocket connected');
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, repoId } = data;

          if (!repoId) return;

          if (type === 'progress') {
            const statusUpdate: IndexingStatus = {
              repository_id: repoId,
              status: 'indexing',
              stage: data.stage,
              progress: data.progress,
              commits_indexed: data.commitsIndexed,
            };
            updateIndexingStatus(repoId, statusUpdate);
          } else if (type === 'complete') {
            const statusUpdate: IndexingStatus = {
              repository_id: repoId,
              status: 'ready',
              stage: 'Completed',
              progress: 100,
            };
            updateIndexingStatus(repoId, statusUpdate);
            toast.success('Repository indexing completed successfully!');
          } else if (type === 'error') {
            const statusUpdate: IndexingStatus = {
              repository_id: repoId,
              status: 'failed',
              stage: 'Failed',
              progress: 0,
            };
            updateIndexingStatus(repoId, statusUpdate);
            toast.error(`Indexing failed for repository: ${data.message || 'Error occurred'}`);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket indexing progress event:', err);
        }
      };

      ws.onclose = () => {
        console.log('Indexing progress WebSocket connection closed');
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
    }

    function scheduleReconnect() {
      // Prevent scheduling duplicates
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Max retry backoff is 30 seconds
      const delay = Math.min(30000, Math.pow(2, retryCountRef.current) * 1000);
      retryCountRef.current += 1;

      console.log(`Scheduling WebSocket reconnect in ${delay}ms`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      if (wsRef.current) {
        // Remove onclose listener to prevent loops during component updates/unmounts
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [accessToken, updateIndexingStatus]);
}

export default useIndexingProgress;
