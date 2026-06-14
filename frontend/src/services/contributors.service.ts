import apiClient from './api';

export interface Contributor {
  id: string;
  repository_id: string;
  primary_email: string;
  display_name: string;
  github_username: string | null;
  avatar_url: string | null;
  total_commits: number;
  total_insertions: number;
  total_deletions: number;
  first_commit_at: string | null;
  last_commit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributorStats {
  id: string;
  display_name: string;
  github_username: string | null;
  avatar_url: string | null;
  total_commits: number;
  total_insertions: number;
  total_deletions: number;
  first_commit_at: string | null;
  last_commit_at: string | null;
  commits_last_7_days: number;
  commits_last_30_days: number;
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

export const contributorsService = {
  async getContributors(repoId: string): Promise<Contributor[]> {
    const res = await apiClient.get(`/repos/${repoId}/contributors`);
    return res.data;
  },

  async getContributorStats(repoId: string): Promise<ContributorStats[]> {
    const res = await apiClient.get(`/repos/${repoId}/contributors/stats`);
    return res.data;
  },

  async getContributorCommits(
    repoId: string,
    contributorId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Commit[]> {
    const res = await apiClient.get(`/repos/${repoId}/contributors/${contributorId}/commits`, {
      params: { limit, offset },
    });
    return res.data;
  },
};

export default contributorsService;
