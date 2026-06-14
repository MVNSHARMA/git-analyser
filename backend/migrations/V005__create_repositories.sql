CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  display_name VARCHAR(255) NULL,
  description TEXT NULL,
  default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
  is_private BOOLEAN NOT NULL DEFAULT false,
  language VARCHAR(100) NULL,
  stars_count INTEGER NOT NULL DEFAULT 0,
  indexing_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (indexing_status IN ('pending','indexing','ready','error','paused')),
  last_indexed_at TIMESTAMPTZ NULL,
  total_commits_count INTEGER NULL,
  total_branches_count INTEGER NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX repositories_user_github_repo_active_idx ON repositories (user_id, github_repo_id) WHERE deleted_at IS NULL;
CREATE INDEX repositories_user_id_idx ON repositories (user_id);
CREATE INDEX repositories_indexing_status_idx ON repositories (indexing_status);

-- Trigger
CREATE TRIGGER repositories_set_updated_at
BEFORE UPDATE ON repositories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
