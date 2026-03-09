import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Qdrant',
  description: 'Set up Qdrant vector database — local Docker + search helpers for semantic AI search',
  category: 'AI / ML',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    restart: unless-stopped
    ports:
      - '6333:6333'   # REST API
      - '6334:6334'   # gRPC
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
`;

    const qdrantClient = hasTypescript
      ? `import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION ?? 'documents';
const VECTOR_SIZE = 1536; // text-embedding-3-small

// ─── Collection management ────────────────────────────────

export async function ensureCollection(vectorSize = VECTOR_SIZE): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: vectorSize, distance: 'Cosine' },
    });
    console.log(\`Created Qdrant collection: \${COLLECTION}\`);
  }
}

// ─── Points (vectors) ─────────────────────────────────────

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export async function upsertPoints(points: QdrantPoint[]): Promise<void> {
  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
  });
}

export async function deletePoints(ids: (string | number)[]): Promise<void> {
  await qdrant.delete(COLLECTION, { wait: true, points: ids });
}

// ─── Search ───────────────────────────────────────────────

export async function searchSimilar(
  vector: number[],
  options: {
    limit?: number;
    filter?: Record<string, unknown>;
    scoreThreshold?: number;
    withPayload?: boolean;
  } = {}
) {
  return qdrant.search(COLLECTION, {
    vector,
    limit: options.limit ?? 10,
    filter: options.filter as any,
    score_threshold: options.scoreThreshold,
    with_payload: options.withPayload ?? true,
    with_vector: false,
  });
}
`
      : `import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION ?? 'documents';
const VECTOR_SIZE = 1536;

export async function ensureCollection(vectorSize = VECTOR_SIZE) {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, { vectors: { size: vectorSize, distance: 'Cosine' } });
    console.log(\`Created Qdrant collection: \${COLLECTION}\`);
  }
}

export async function upsertPoints(points) {
  await qdrant.upsert(COLLECTION, { wait: true, points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })) });
}

export async function deletePoints(ids) {
  await qdrant.delete(COLLECTION, { wait: true, points: ids });
}

export async function searchSimilar(vector, options = {}) {
  return qdrant.search(COLLECTION, {
    vector,
    limit: options.limit ?? 10,
    filter: options.filter,
    score_threshold: options.scoreThreshold,
    with_payload: options.withPayload ?? true,
    with_vector: false,
  });
}
`;

    return [
      installStep(packageManager, ['@qdrant/js-client-rest']),
      {
        type: 'write',
        label: 'Write docker-compose.qdrant.yml',
        filePath: 'docker-compose.qdrant.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/qdrant.${ext}`,
        filePath: `lib/qdrant.${ext}`,
        content: qdrantClient,
      },
      {
        type: 'env',
        label: 'Add Qdrant env vars to .env.example',
        vars: {
          QDRANT_URL: 'http://localhost:6333',
          QDRANT_API_KEY: '',
          QDRANT_COLLECTION: 'documents',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/qdrant.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start Qdrant: `docker compose -f docker-compose.qdrant.yml up -d`',
      'Open Qdrant UI: http://localhost:6333/dashboard',
      'Call ensureCollection() once at startup',
      'Pair with OpenAI for embeddings: `just-start-dude setup openai`',
      'Use upsertPoints() to index embeddings and searchSimilar() to query',
    ];
  },
};

function docContent(date) {
  return `# Qdrant Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`@qdrant/js-client-rest\` |
| \`docker-compose.qdrant.yml\` | Qdrant vector DB container |
| \`lib/qdrant.js\` | Client, collection, upsert, search helpers |

## Usage
\`\`\`js
import { ensureCollection, upsertPoints, searchSimilar } from '@/lib/qdrant';
import { embedOne } from '@/lib/openai';

await ensureCollection();

// Index a document
const embedding = await embedOne('Qdrant is a vector database');
await upsertPoints([{ id: 'doc-1', vector: embedding, payload: { text: 'Qdrant is a vector database', source: 'docs' } }]);

// Search
const queryVec = await embedOne('What is a vector database?');
const results = await searchSimilar(queryVec, { limit: 5, scoreThreshold: 0.7 });
\`\`\`

## Resources
- [Qdrant Docs](https://qdrant.tech/documentation)
- [Qdrant Cloud](https://cloud.qdrant.io)
`;
}
