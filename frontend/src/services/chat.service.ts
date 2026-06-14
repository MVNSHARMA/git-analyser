import apiClient from './api';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  context_shas: string[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  repository_id: string;
  user_id: string;
  title: string | null;
  branch_filter: string | null;
  created_at: string;
  updated_at: string;
}

export const chatService = {
  async createConversation(repoId: string, branchFilter?: string | null): Promise<Conversation> {
    const res = await apiClient.post('/chat/conversations', { repoId, branchFilter });
    return res.data;
  },

  async getConversations(repoId: string): Promise<Conversation[]> {
    const res = await apiClient.get(`/chat/${repoId}/conversations`);
    return res.data;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return res.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`);
  },

  async submitFeedback(messageId: string, feedback: 'like' | 'dislike', detail?: string): Promise<void> {
    await apiClient.post(`/chat/messages/${messageId}/feedback`, { feedback, detail });
  },

  async streamChat(
    conversationId: string,
    message: string,
    onDelta: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    const token = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(`${BASE_URL}/api/v1/chat/conversations/${conversationId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body returned from streaming endpoint');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Retain the last unfinished line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'delta') {
                onDelta(parsed.text);
              } else if (parsed.type === 'done') {
                onDone();
              } else if (parsed.type === 'error') {
                onError(new Error(parsed.message || 'Error chunk received'));
              }
            } catch (err) {
              console.error('Failed to parse SSE data block:', dataStr, err);
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },
};

export default chatService;
