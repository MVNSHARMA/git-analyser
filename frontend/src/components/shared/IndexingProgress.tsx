import { useRepoStore } from '../../stores/repoStore';
import Badge from './Badge';

interface IndexingProgressProps {
  repoId: string;
  showDetails?: boolean;
}

export function IndexingProgress({ repoId, showDetails = true }: IndexingProgressProps) {
  const { indexingStatus, repos } = useRepoStore();
  const repo = repos.find((r) => r.id === repoId);
  const status = indexingStatus[repoId];

  // Fallback to repository object state if WebSocket state is not yet loaded
  const currentStatus = status?.status || repo?.indexing_status || 'never_indexed';
  const currentStage = status?.stage || (currentStatus === 'ready' ? 'Completed' : 'Queued');
  const currentProgress = status?.progress !== undefined ? status.progress : (currentStatus === 'ready' ? 100 : 0);

  if (currentStatus === 'never_indexed') {
    return (
      <div className="text-xs text-fg-muted">
        Never indexed. Click reindex to begin.
      </div>
    );
  }

  const badgeVariants = {
    queued: 'info' as const,
    indexing: 'warning' as const,
    completed: 'success' as const,
    ready: 'success' as const,
    failed: 'error' as const,
    never_indexed: 'default' as const,
  };

  const badgeText = {
    queued: 'Queued',
    indexing: 'Indexing',
    completed: 'Ready',
    ready: 'Ready',
    failed: 'Failed',
    never_indexed: 'Never Indexed',
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariants[currentStatus as keyof typeof badgeVariants] || 'default'}>
            {badgeText[currentStatus as keyof typeof badgeText] || currentStatus}
          </Badge>
          {currentStatus === 'indexing' && (
            <span className="text-xs text-fg-muted font-medium tracking-wide animate-pulse capitalize">
              Stage: {currentStage?.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-accent-emphasis">
          {currentProgress}%
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-1.5 bg-canvas-inset rounded-full overflow-hidden border border-muted">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            currentStatus === 'failed'
              ? 'bg-danger-emphasis'
              : currentStatus === 'ready' || currentStatus === 'completed'
              ? 'bg-success-emphasis'
              : 'bg-accent-emphasis'
          }`}
          style={{ width: `${currentProgress}%` }}
        />
      </div>

      {showDetails && currentStatus === 'indexing' && (
        <div className="mt-2 text-[10px] text-fg-muted leading-normal">
          Indexing repository metadata, git branches, commits history, lines changes, and vector embeddings in Pinecone...
        </div>
      )}
    </div>
  );
}

export default IndexingProgress;
