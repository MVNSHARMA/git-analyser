import apiClient from './api';

export interface CommitFilters {
  branch?: string;
  author?: string;
  search?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export interface Commit {
  id: string;
  repository_id: string;
  contributor_id: string | null;
  sha: string;
  short_sha: string;
  message: string;
  message_subject: string;
  author_name: string;
  author_email: string | null;
  committed_at: string;
  additions: number | null;
  deletions: number | null;
  files_changed_count: number | null;
  diff_stored: boolean;
  vector_id: string | null;
  created_at: string;
}

export interface CommitDetail extends Omit<Commit, 'created_at'> {
  contributor_github_username: string | null;
  diffs: Array<{
    filename: string;
    patch?: string;
    additions?: number;
    deletions?: number;
    status?: string;
  }>;
}

export interface ActivityByDay {
  date: string;
  commit_count: number;
  active_contributors: number;
}

export const commitsService = {
  async getCommits(
    repoId: string,
    filters: CommitFilters
  ): Promise<{ commits: Commit[]; total: number; limit: number; offset: number }> {
    const res = await apiClient.get(`/repos/${repoId}/commits`, {
      params: filters,
    });
    return res.data;
  },

  async getCommit(repoId: string, sha: string): Promise<CommitDetail> {
    const res = await apiClient.get(`/repos/${repoId}/commits/${sha}`);
    return res.data;
  },

  async getActivity(repoId: string, days: number = 30): Promise<ActivityByDay[]> {
    const res = await apiClient.get(`/repos/${repoId}/commits/activity`, {
      params: { days },
    });
    return res.data;
  },
};

export default commitsService;
