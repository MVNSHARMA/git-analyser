import { query } from '../../config/db';
import { NotFoundError, ConflictError } from '../../errors';

export interface Conversation {
  id: string;
  user_id: string;
  repository_id: string;
  branch_filter: string | null;
  title: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  context_shas: string[];
  feedback: 'positive' | 'negative' | null;
  feedback_detail: Record<string, unknown> | null;
  created_at: Date;
}

/**
 * Creates a new conversation for a user and repository.
 * Verifies repository ownership and readiness.
 */
export async function createConversation(
  userId: string,
  repoId: string,
  branchFilter?: string
): Promise<Conversation> {
  // 1. Verify repository exists, belongs to user, and is fully indexed
  const repoRes = await query<{ indexing_status: string }>(`
    SELECT indexing_status 
    FROM repositories 
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
  `, [repoId, userId]);

  if (repoRes.rows.length === 0) {
    throw new NotFoundError('Repository not found', 'REPO_NOT_FOUND');
  }

  const { indexing_status } = repoRes.rows[0];
  if (indexing_status !== 'ready') {
    throw new ConflictError('Repository is not fully indexed yet', 'REPO_NOT_INDEXED');
  }

  // 2. Insert new conversation
  const insertRes = await query<Conversation>(`
    INSERT INTO chat_conversations (user_id, repository_id, branch_filter)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [userId, repoId, branchFilter || null]);

  return insertRes.rows[0];
}

/**
 * Retrieves all conversations for a user and repository.
 */
export async function getConversations(userId: string, repoId: string): Promise<Conversation[]> {
  const res = await query<Conversation>(`
    SELECT * 
    FROM chat_conversations 
    WHERE user_id = $1 AND repository_id = $2 AND deleted_at IS NULL 
    ORDER BY updated_at DESC
  `, [userId, repoId]);

  return res.rows;
}

/**
 * Retrieves all messages in a conversation.
 * Verifies that the conversation belongs to the user.
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string
): Promise<ChatMessage[]> {
  // 1. Verify conversation belongs to user
  const convRes = await query<{ user_id: string }>(`
    SELECT user_id 
    FROM chat_conversations 
    WHERE id = $1 AND deleted_at IS NULL
  `, [conversationId]);

  if (convRes.rows.length === 0 || convRes.rows[0].user_id !== userId) {
    throw new NotFoundError('Conversation not found');
  }

  // 2. Fetch messages in chronological order
  const msgRes = await query<ChatMessage>(`
    SELECT * 
    FROM chat_messages 
    WHERE conversation_id = $1 
    ORDER BY created_at ASC
  `, [conversationId]);

  return msgRes.rows;
}

/**
 * Soft deletes a conversation.
 * Verifies that the conversation belongs to the user.
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const res = await query(`
    UPDATE chat_conversations 
    SET deleted_at = NOW() 
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
  `, [conversationId, userId]);

  if (res.rowCount === 0) {
    throw new NotFoundError('Conversation not found');
  }
}

/**
 * Records user feedback (positive or negative) on an AI message.
 * Verifies that the message belongs to a conversation owned by the user.
 */
export async function submitFeedback(
  userId: string,
  messageId: string,
  feedback: 'positive' | 'negative',
  detail?: object
): Promise<void> {
  // 1. Verify message belongs to the user's conversation
  const msgRes = await query<{ user_id: string }>(`
    SELECT c.user_id 
    FROM chat_messages m 
    JOIN chat_conversations c ON m.conversation_id = c.id 
    WHERE m.id = $1 AND c.deleted_at IS NULL
  `, [messageId]);

  if (msgRes.rows.length === 0 || msgRes.rows[0].user_id !== userId) {
    throw new NotFoundError('Message not found');
  }

  // 2. Update message feedback
  const feedbackDetail = detail ? JSON.stringify(detail) : null;
  await query(`
    UPDATE chat_messages 
    SET feedback = $1, feedback_detail = $2 
    WHERE id = $3
  `, [feedback, feedbackDetail, messageId]);
}
