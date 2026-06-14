CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  primary_email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  github_username VARCHAR(255) NULL,
  avatar_url TEXT NULL,
  total_commits INTEGER NOT NULL DEFAULT 0,
  total_insertions INTEGER NOT NULL DEFAULT 0,
  total_deletions INTEGER NOT NULL DEFAULT 0,
  first_commit_at TIMESTAMPTZ NULL,
  last_commit_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contributors_repository_id_primary_email_unique UNIQUE (repository_id, primary_email)
);

-- Trigger
CREATE TRIGGER contributors_set_updated_at
BEFORE UPDATE ON contributors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
