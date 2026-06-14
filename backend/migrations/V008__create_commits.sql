CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  contributor_id UUID NULL REFERENCES contributors(id) ON DELETE SET NULL,
  sha VARCHAR(40) NOT NULL,
  short_sha VARCHAR(7) NOT NULL,
  message TEXT NOT NULL,
  message_subject VARCHAR(500) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  additions INTEGER NULL,
  deletions INTEGER NULL,
  files_changed_count INTEGER NULL,
  diff_stored BOOLEAN NOT NULL DEFAULT false,
  vector_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commits_repository_id_sha_unique UNIQUE (repository_id, sha)
);

-- Indexes
CREATE INDEX commits_repository_id_committed_at_desc_idx ON commits (repository_id, committed_at DESC);
CREATE INDEX commits_contributor_id_idx ON commits (contributor_id);
CREATE INDEX commits_author_email_idx ON commits (author_email);
CREATE INDEX commits_message_fts_idx ON commits USING gin(to_tsvector('english', message));
