import apiClient from './api';

export interface IndexingJob {
  id: string;
  repository_id: string;
  triggered_by: string;
  status: 'queued' | 'indexing' | 'completed' | 'failed';
  stage: string | null;
  progress: number;
  commits_indexed: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export const indexingService = {
  async getIndexingStatus(repoId: string): Promise<IndexingJob | null> {
    const res = await apiClient.get(`/repos/${repoId}/indexing/status`);
    return res.data;
  },

  async getIndexingHistory(repoId: string): Promise<IndexingJob[]> {
    const res = await apiClient.get(`/repos/${repoId}/indexing/history`);
    return res.data;
  },
};

export default indexingService;
