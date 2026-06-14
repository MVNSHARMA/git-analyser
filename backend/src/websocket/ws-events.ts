import { publish } from '../config/redis';

export interface IndexingProgressEvent {
  type: 'progress';
  repoId: string;
  stage: string;
  progress: number;
  commitsIndexed: number;
}

export interface IndexingCompleteEvent {
  type: 'complete';
  repoId: string;
}

export interface IndexingErrorEvent {
  type: 'error';
  repoId: string;
  errorCode: string;
  message: string;
}

export type WsEvent = IndexingProgressEvent | IndexingCompleteEvent | IndexingErrorEvent;

/**
 * Publish an indexing pipeline event to the Redis channel for the given repository.
 */
export async function publishEvent(repoId: string, event: WsEvent): Promise<void> {
  const channel = `pubsub:repo:${repoId}`;
  await publish(channel, JSON.stringify(event));
}
