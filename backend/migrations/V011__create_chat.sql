-- Table 1: chat_conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch_filter VARCHAR(255) NULL,
  title VARCHAR(255) NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for chat_conversations
CREATE TRIGGER chat_conversations_set_updated_at
BEFORE UPDATE ON chat_conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Index for chat_conversations
CREATE INDEX chat_conversations_user_id_repository_id_idx ON chat_conversations (user_id, repository_id);


-- Table 2: chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_shas TEXT[] NOT NULL DEFAULT '{}',
  feedback VARCHAR(20) NULL CHECK (feedback IN ('positive','negative')),
  feedback_detail JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for chat_messages
CREATE INDEX chat_messages_conversation_id_created_at_idx ON chat_messages (conversation_id, created_at ASC);
