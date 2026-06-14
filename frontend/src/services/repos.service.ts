import apiClient from './api';

export const reposService = {
  async getRepos() {
    const res = await apiClient.get('/repos');
    return res.data;
  },

  async addRepo(githubUrl: string, displayName?: string) {
    const res = await apiClient.post('/repos', { githubUrl, displayName });
    return res.data;
  },

  async deleteRepo(repoId: string) {
    const res = await apiClient.delete(`/repos/${repoId}`);
    return res.data;
  },

  async reindexRepo(repoId: string) {
    const res = await apiClient.post(`/repos/${repoId}/reindex`);
    return res.data;
  },
};

export default reposService;
