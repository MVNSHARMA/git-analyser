CREATE TABLE indexing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  triggered_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','paused','completed','failed')),
  stage VARCHAR(50) NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  commits_indexed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  error_code VARCHAR(100) NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX indexing_jobs_repository_id_idx ON indexing_jobs (repository_id);
CREATE INDEX indexing_jobs_status_idx ON indexing_jobs (status);
