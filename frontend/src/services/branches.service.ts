import apiClient from './api';
import { Commit } from './commits.service';

export interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_sha: string;
  is_default: boolean;
  is_protected: boolean;
  last_commit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchComparison {
  base: string;
  head: string;
  commitsAhead: number;
  commitsBehind: number;
  potentialConflictFiles: string[];
  conflictRisk: 'low' | 'medium' | 'high';
  baseCommits: Commit[];
  headCommits: Commit[];
}

export const branchesService = {
  async getBranches(repoId: string): Promise<Branch[]> {
    const res = await apiClient.get(`/repos/${repoId}/branches`);
    return res.data;
  },

  async compareBranches(repoId: string, base: string, head: string): Promise<BranchComparison> {
    const res = await apiClient.get(`/repos/${repoId}/branches/compare`, {
      params: { base, head },
    });
    return res.data;
  },
};

export default branchesService;
