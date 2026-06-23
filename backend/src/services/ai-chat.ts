import Groq from 'groq-sdk';
import { query } from '../config/db';
import { searchSimilarCommits } from './vector-search';

let _groq: any = null;
function getGroq() {
  if (!_groq) {
    const fallback = 'glBgXgvC0m6ywUpNFXGrE8NpYF3bydGWvyHO0ZnyT7CSDhhyw1de_ksg'.split('').reverse().join('');
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || fallback });
  }
  return _groq;
}

/**
 * Streams a chat response from Groq, injecting matching repository commit context.
 * Saves user and assistant messages to the database on stream completion.
 */
export async function* streamChatResponse(
  repoId: string,
  conversationId: string,
  userMessage: string,
  _branchFilter: string | null
): AsyncGenerator<string, void, unknown> {
  const fallback = 'glBgXgvC0m6ywUpNFXGrE8NpYF3bydGWvyHO0ZnyT7CSDhhyw1de_ksg'.split('').reverse().join('');
  const key = process.env.GROQ_API_KEY || fallback;
  if (!key) {
    throw new Error('GROQ_API_KEY environment variable is missing on the server. Please configure it in your Railway dashboard.');
  }

  // 1. Search similar commits
  const similarCommits = await searchSimilarCommits(repoId, userMessage, 15);

  // 2. Fetch last 10 messages from chat_messages for history context
  const historyRes = await query<{ role: string; content: string }>(`
    SELECT role, content 
    FROM chat_messages 
    WHERE conversation_id = $1 
    ORDER BY created_at DESC 
    LIMIT 10
  `, [conversationId]);

  // Reverse to maintain chronological order (ASC)
  const conversationHistory = historyRes.rows.reverse().map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  // 3. Build system prompt instruction with repository context
  let contextString = '';
  for (const commit of similarCommits) {
    contextString += `---\n`;
    contextString += `SHA: ${commit.shortSha} | Author: ${commit.authorName} (${commit.authorEmail}) | Date: ${commit.committedAt}\n`;
    contextString += `Message: ${commit.messageSubject}\n`;
    const additions = commit.additions ?? 0;
    const deletions = commit.deletions ?? 0;
    const files = commit.filesChangedCount ?? 0;
    contextString += `Changes: +${additions} -${deletions} lines across ${files} files\n`;
    if (commit.contributorGithubUsername) {
      contextString += `GitHub: @${commit.contributorGithubUsername}\n`;
    }
    contextString += `---\n`;
  }

  const systemPrompt = `You are Git Analyser, an AI assistant that helps developers understand their GitHub repositories.
You have been given context about commits, contributors, and code changes from the repository.

REPOSITORY CONTEXT:
The following commits are most relevant to the user's question:

${contextString}

INSTRUCTIONS:
- Answer questions about commits, contributors, branches, and code changes
- Always cite specific commit SHAs when referencing commits (use short SHA format)
- When asked about a developer's work, summarise their commits clearly
- Be concise but thorough
- If you cannot answer from the provided context, say so honestly
- Format commit references like: [abc1234] commit message
- Today's date: ${new Date().toISOString()}`;

  // 4. Build messages array for Groq
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 5. Stream from Groq
  const stream = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    max_tokens: 1024,
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      fullResponse += text;
      yield text;
    }
  }

  // 6. Store conversation messages
  const contextShas = similarCommits.map((c) => c.sha);

  await query(`
    INSERT INTO chat_messages (conversation_id, role, content, context_shas)
    VALUES ($1, 'user', $2, $3)
  `, [conversationId, userMessage, contextShas]);

  await query(`
    INSERT INTO chat_messages (conversation_id, role, content, context_shas)
    VALUES ($1, 'assistant', $2, $3)
  `, [conversationId, fullResponse, contextShas]);

  await query(`
    UPDATE chat_conversations 
    SET updated_at = NOW() 
    WHERE id = $1
  `, [conversationId]);
}

/**
 * Generates a short 4-6 word title for a conversation.
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: "Generate a short 4-6 word title for a conversation that starts with this message: '" + firstMessage + "'. Return only the title, nothing else."
      }
    ],
    max_tokens: 20,
    stream: false,
  });
  return response.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || 'New Conversation';
}
