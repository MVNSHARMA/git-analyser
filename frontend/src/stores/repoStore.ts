import { create } from 'zustand';

export interface Repository {
  id: string;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  display_name: string;
  indexing_status: 'never_indexed' | 'indexing' | 'ready' | 'failed';
  default_branch: string;
  last_indexed_at: string | null;
  created_at: string;
}

export interface IndexingStatus {
  repository_id: string;
  status: 'never_indexed' | 'indexing' | 'ready' | 'failed' | 'queued' | 'completed';
  stage: string | null;
  progress: number;
  commits_indexed?: number;
}

interface RepoState {
  repos: Repository[];
  selectedRepo: Repository | null;
  indexingStatus: Record<string, IndexingStatus>; // repoId -> IndexingStatus
  setRepos: (repos: Repository[]) => void;
  setSelectedRepo: (repo: Repository | null) => void;
  updateIndexingStatus: (repoId: string, status: IndexingStatus) => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repos: [],
  selectedRepo: null,
  indexingStatus: {},
  setRepos: (repos) => set({ repos }),
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  updateIndexingStatus: (repoId, status) =>
    set((state) => {
      // Also update the status inside the repos list if present
      const updatedRepos = state.repos.map((r) => {
        if (r.id === repoId) {
          // Map backend job status names to repo indexing_status values
          let mappedStatus = r.indexing_status;
          if (status.status === 'completed' || status.status === 'ready') {
            mappedStatus = 'ready';
          } else if (status.status === 'failed') {
            mappedStatus = 'failed';
          } else if (status.status === 'indexing' || status.status === 'queued') {
            mappedStatus = 'indexing';
          }
          return { ...r, indexing_status: mappedStatus };
        }
        return r;
      });

      const updatedSelectedRepo =
        state.selectedRepo?.id === repoId
          ? updatedRepos.find((r) => r.id === repoId) || state.selectedRepo
          : state.selectedRepo;

      return {
        repos: updatedRepos,
        selectedRepo: updatedSelectedRepo,
        indexingStatus: {
          ...state.indexingStatus,
          [repoId]: status,
        },
      };
    }),
}));
