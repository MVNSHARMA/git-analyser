import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createConversationHandler,
  listConversationsHandler,
  getMessagesHandler,
  deleteConversationHandler,
  feedbackHandler,
  chatStreamHandler,
} from './chat.controller';

export const chatRouter = Router();

// Protect all chat routes with authenticate middleware
chatRouter.use(authenticate);

// Mapped endpoints
chatRouter.post('/chat/conversations', createConversationHandler);
chatRouter.get('/chat/:repoId/conversations', listConversationsHandler);
chatRouter.get('/chat/conversations/:conversationId/messages', getMessagesHandler);
chatRouter.delete('/chat/conversations/:conversationId', deleteConversationHandler);
chatRouter.post('/chat/messages/:messageId/feedback', feedbackHandler);
chatRouter.post('/chat/conversations/:conversationId/chat', chatStreamHandler);
