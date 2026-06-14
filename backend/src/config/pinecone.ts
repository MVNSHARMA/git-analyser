import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeInstance) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeInstance;
}

/**
 * Get the Pinecone index instance.
 * The index name is read from the PINECONE_INDEX env var.
 */
export function getPineconeIndex() {
  if (!process.env.PINECONE_INDEX) {
    throw new Error('PINECONE_INDEX environment variable is required');
  }
  return getPineconeClient().index(process.env.PINECONE_INDEX as string);
}

export const pinecone = new Proxy({} as Pinecone, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined;
    return Reflect.get(getPineconeClient(), prop, receiver);
  }
});

export default pinecone;
