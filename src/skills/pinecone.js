import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Pinecone',
  description: 'Set up Pinecone vector database for AI similarity search, RAG, and semantic queries',
  category: 'AI / ML',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const pineconeClient = hasTypescript
      ? `import { Pinecone } from '@pinecone-database/pinecone';

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? 'my-index';
const DIMENSION = 1536; // text-embedding-3-small dimensions

// ─── Index management ─────────────────────────────────────

export async function getIndex() {
  return pinecone.index(INDEX_NAME);
}

export async function createIndexIfNotExists(dimension = DIMENSION) {
  const existing = await pinecone.listIndexes();
  const exists = existing.indexes?.some((i) => i.name === INDEX_NAME);
  if (!exists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    });
    console.log(\`Created Pinecone index: \${INDEX_NAME}\`);
  }
}

// ─── Vectors ──────────────────────────────────────────────

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean | string[]>;
}

export async function upsertVectors(vectors: VectorRecord[], namespace?: string) {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  await ns.upsert(vectors);
}

export async function queryVectors(
  vector: number[],
  options: {
    topK?: number;
    namespace?: string;
    filter?: Record<string, unknown>;
    includeMetadata?: boolean;
  } = {}
) {
  const index = await getIndex();
  const ns = options.namespace ? index.namespace(options.namespace) : index;
  return ns.query({
    vector,
    topK: options.topK ?? 10,
    filter: options.filter,
    includeMetadata: options.includeMetadata ?? true,
    includeValues: false,
  });
}

export async function deleteVectors(ids: string[], namespace?: string) {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  await ns.deleteMany(ids);
}

export async function deleteAll(namespace?: string) {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  await ns.deleteAll();
}
`
      : `import { Pinecone } from '@pinecone-database/pinecone';

export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
export const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? 'my-index';
const DIMENSION = 1536;

export async function getIndex() {
  return pinecone.index(INDEX_NAME);
}

export async function createIndexIfNotExists(dimension = DIMENSION) {
  const existing = await pinecone.listIndexes();
  const exists = existing.indexes?.some((i) => i.name === INDEX_NAME);
  if (!exists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    });
    console.log(\`Created Pinecone index: \${INDEX_NAME}\`);
  }
}

export async function upsertVectors(vectors, namespace) {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  await ns.upsert(vectors);
}

export async function queryVectors(vector, options = {}) {
  const index = await getIndex();
  const ns = options.namespace ? index.namespace(options.namespace) : index;
  return ns.query({
    vector,
    topK: options.topK ?? 10,
    filter: options.filter,
    includeMetadata: options.includeMetadata ?? true,
    includeValues: false,
  });
}

export async function deleteVectors(ids, namespace) {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  await ns.deleteMany(ids);
}
`;

    const ragHelper = hasTypescript
      ? `/**
 * Simple RAG (Retrieval-Augmented Generation) helper.
 * Requires: openai skill (just-start-dude setup openai)
 */
import { embedOne } from './openai';
import { upsertVectors, queryVectors } from './pinecone';

export async function indexDocument(id: string, text: string, metadata?: Record<string, string | number>): Promise<void> {
  const embedding = await embedOne(text);
  await upsertVectors([{ id, values: embedding, metadata: { text, ...metadata } }]);
}

export async function search(query: string, topK = 5): Promise<Array<{ id: string; score: number; text: string; metadata: Record<string, unknown> }>> {
  const embedding = await embedOne(query);
  const results = await queryVectors(embedding, { topK });
  return results.matches.map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    text: (m.metadata?.text as string) ?? '',
    metadata: m.metadata ?? {},
  }));
}
`
      : `import { embedOne } from './openai.js';
import { upsertVectors, queryVectors } from './pinecone.js';

export async function indexDocument(id, text, metadata = {}) {
  const embedding = await embedOne(text);
  await upsertVectors([{ id, values: embedding, metadata: { text, ...metadata } }]);
}

export async function search(query, topK = 5) {
  const embedding = await embedOne(query);
  const results = await queryVectors(embedding, { topK });
  return results.matches.map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    text: m.metadata?.text ?? '',
    metadata: m.metadata ?? {},
  }));
}
`;

    return [
      installStep(packageManager, ['@pinecone-database/pinecone']),
      {
        type: 'write',
        label: `Write lib/pinecone.${ext}`,
        filePath: `lib/pinecone.${ext}`,
        content: pineconeClient,
      },
      {
        type: 'write',
        label: `Write lib/rag.${ext}`,
        filePath: `lib/rag.${ext}`,
        content: ragHelper,
      },
      {
        type: 'env',
        label: 'Add Pinecone env vars to .env.example',
        vars: {
          PINECONE_API_KEY: 'your-pinecone-api-key',
          PINECONE_INDEX_NAME: 'my-index',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/pinecone.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create a free account at https://pinecone.io',
      'Get your API key from the Pinecone console',
      'Create your index: call `createIndexIfNotExists()` once at startup',
      'Index documents with `indexDocument(id, text)` from lib/rag',
      'Search semantically with `search(query)` from lib/rag',
      'Pair with OpenAI skill for full RAG: `just-start-dude setup openai`',
    ];
  },
};

function docContent(date) {
  return `# Pinecone Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`@pinecone-database/pinecone\` |
| \`lib/pinecone.js\` | Pinecone client, upsert, query, delete helpers |
| \`lib/rag.js\` | RAG helpers: indexDocument(), search() |

## Usage

### Index a document (RAG)
\`\`\`js
import { indexDocument, search } from '@/lib/rag';

// Index text
await indexDocument('doc-1', 'Pinecone is a vector database...', { source: 'docs' });

// Semantic search
const results = await search('What is a vector database?');
results.forEach((r) => console.log(r.score, r.text));
\`\`\`

### Direct vector operations
\`\`\`js
import { upsertVectors, queryVectors, createIndexIfNotExists } from '@/lib/pinecone';

await createIndexIfNotExists();
await upsertVectors([{ id: 'item-1', values: [0.1, 0.2, ...], metadata: { label: 'cat' } }]);
const results = await queryVectors(queryEmbedding, { topK: 5 });
\`\`\`

## Resources
- [Pinecone Docs](https://docs.pinecone.io)
- [RAG Guide](https://docs.pinecone.io/guides/get-started/rag-guide)
`;
}
