CREATE TABLE commit_diffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commit_id UUID NOT NULL UNIQUE REFERENCES commits(id) ON DELETE CASCADE,
  diff_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commit_diffs_diff_json_array_check CHECK (jsonb_typeof(diff_json) = 'array')
);

-- Indexes
CREATE INDEX commit_diffs_commit_id_idx ON commit_diffs (commit_id);
