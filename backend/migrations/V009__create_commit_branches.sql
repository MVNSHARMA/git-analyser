CREATE TABLE commit_branches (
  commit_id UUID NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (commit_id, branch_id)
);

-- Indexes
CREATE INDEX commit_branches_branch_id_idx ON commit_branches (branch_id);
