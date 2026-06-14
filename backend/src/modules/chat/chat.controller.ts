import { Request, Response, NextFunction } from 'express';
import {
  createConversation,
  getConversations,
  getConversationMessages,
  deleteConversation,
  submitFeedback,
} from './chat.service';
import { streamChatResponse, generateConversationTitle } from '../../services/ai-chat';
import { query } from '../../config/db';
import { AuthError, ValidationError, NotFoundError } from '../../errors';

/**
 * Retrieves authenticated user's ID from request context.
 */
function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

/**
 * POST /chat/conversations
 * Create a new chat conversation.
 */
export async function createConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId, branchFilter } = req.body;

    if (!repoId) {
      throw new ValidationError('repoId is required');
    }

    const conversation = await createConversation(userId, repoId, branchFilter);
    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /chat/:repoId/conversations
 * Retrieve conversations list for a repository.
 */
export async function listConversationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;

    const conversations = await getConversations(userId, repoId);
    res.status(200).json(conversations);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /chat/conversations/:conversationId/messages
 * Fetch messages inside a conversation.
 */
export async function getMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { conversationId } = req.params;

    const messages = await getConversationMessages(userId, conversationId);
    res.status(200).json(messages);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /chat/conversations/:conversationId
 * Soft delete a conversation.
 */
export async function deleteConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { conversationId } = req.params;

    await deleteConversation(userId, conversationId);
    res.status(200).json({ message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /chat/messages/:messageId/feedback
 * Record feedback on an AI-generated message.
 */
export async function feedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { messageId } = req.params;
    const { feedback, detail } = req.body;

    if (!feedback || (feedback !== 'positive' && feedback !== 'negative')) {
      throw new ValidationError('feedback must be either "positive" or "negative"');
    }

    await submitFeedback(userId, messageId, feedback, detail);
    res.status(200).json({ message: 'Feedback recorded' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /chat/conversations/:conversationId/chat
 * Streams AI chat response using Server-Sent Events (SSE).
 */
export async function chatStreamHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { conversationId } = req.params;
    const { message } = req.body;

    // 1. Validate inputs
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new ValidationError('message is required and must be a non-empty string');
    }

    if (message.length > 2000) {
      throw new ValidationError('message must be at most 2000 characters');
    }

    // 2. Verify conversation belongs to user and get repo ID / branch filter
    const convRes = await query<{ repository_id: string; branch_filter: string | null; user_id: string; title: string | null }>(`
      SELECT repository_id, branch_filter, user_id, title 
      FROM chat_conversations 
      WHERE id = $1 AND deleted_at IS NULL
    `, [conversationId]);

    if (convRes.rows.length === 0 || convRes.rows[0].user_id !== userId) {
      throw new NotFoundError('Conversation not found');
    }

    const { repository_id: repoId, branch_filter: branchFilter, title } = convRes.rows[0];

    // 3. Set SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 4. Stream response from Gemini
    try {
      const chatGen = streamChatResponse(repoId, conversationId, message, branchFilter);
      for await (const chunk of chatGen) {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
      }

      // 5. Generate and update title if it's currently NULL
      if (!title) {
        try {
          const generatedTitle = await generateConversationTitle(message);
          await query(`
            UPDATE chat_conversations 
            SET title = $1 
            WHERE id = $2
          `, [generatedTitle, conversationId]);
        } catch (titleErr) {
          console.error('Failed to generate conversation title:', titleErr);
        }
      }

      // 6. Signal stream completion
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (streamErr: any) {
      console.error('Error during AI chat streaming:', streamErr);
      res.write(`data: ${JSON.stringify({ type: 'error', message: streamErr.message || 'Stream error occurred' })}\n\n`);
      res.end();
    }
  } catch (err) {
    next(err);
  }
}
