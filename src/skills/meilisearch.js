import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Meilisearch',
  description: 'Set up Meilisearch instant search — local Docker + search helpers + typo-tolerant full-text search',
  category: 'Search',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  meilisearch:
    image: getmeili/meilisearch:v1.6
    restart: unless-stopped
    ports:
      - '7700:7700'
    environment:
      - MEILI_MASTER_KEY=\${MEILISEARCH_MASTER_KEY:-masterkey-change-in-production}
      - MEILI_ENV=development
    volumes:
      - meilisearch_data:/meili_data

volumes:
  meilisearch_data:
`;

    const searchClient = hasTypescript
      ? `import { MeiliSearch } from 'meilisearch';

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY ?? process.env.MEILISEARCH_MASTER_KEY,
});

// ─── Index management ─────────────────────────────────────

export async function getIndex(indexName: string) {
  return meili.index(indexName);
}

export async function createIndex(indexName: string, primaryKey = 'id') {
  const task = await meili.createIndex(indexName, { primaryKey });
  await meili.waitForTask(task.taskUid);
  return meili.index(indexName);
}

// ─── Documents ────────────────────────────────────────────

export async function addDocuments<T extends Record<string, unknown>>(
  indexName: string,
  documents: T[]
): Promise<void> {
  const index = meili.index(indexName);
  const task = await index.addDocuments(documents);
  await meili.waitForTask(task.taskUid);
}

export async function deleteDocuments(indexName: string, ids: (string | number)[]): Promise<void> {
  const index = meili.index(indexName);
  const task = await index.deleteDocuments(ids);
  await meili.waitForTask(task.taskUid);
}

// ─── Search ───────────────────────────────────────────────

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string | string[];
  sort?: string[];
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
}

export async function search<T = Record<string, unknown>>(
  indexName: string,
  query: string,
  options: SearchOptions = {}
) {
  const index = meili.index(indexName);
  return index.search<T>(query, {
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    filter: options.filter,
    sort: options.sort,
    attributesToHighlight: options.attributesToHighlight,
    highlightPreTag: options.highlightPreTag ?? '<mark>',
    highlightPostTag: options.highlightPostTag ?? '</mark>',
  });
}
`
      : `import { MeiliSearch } from 'meilisearch';

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY ?? process.env.MEILISEARCH_MASTER_KEY,
});

export async function getIndex(indexName) {
  return meili.index(indexName);
}

export async function createIndex(indexName, primaryKey = 'id') {
  const task = await meili.createIndex(indexName, { primaryKey });
  await meili.waitForTask(task.taskUid);
  return meili.index(indexName);
}

export async function addDocuments(indexName, documents) {
  const index = meili.index(indexName);
  const task = await index.addDocuments(documents);
  await meili.waitForTask(task.taskUid);
}

export async function deleteDocuments(indexName, ids) {
  const index = meili.index(indexName);
  const task = await index.deleteDocuments(ids);
  await meili.waitForTask(task.taskUid);
}

export async function search(indexName, query, options = {}) {
  const index = meili.index(indexName);
  return index.search(query, {
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    filter: options.filter,
    sort: options.sort,
    attributesToHighlight: options.attributesToHighlight,
    highlightPreTag: options.highlightPreTag ?? '<mark>',
    highlightPostTag: options.highlightPostTag ?? '</mark>',
  });
}
`;

    return [
      installStep(packageManager, ['meilisearch']),
      {
        type: 'write',
        label: 'Write docker-compose.meilisearch.yml',
        filePath: 'docker-compose.meilisearch.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/search.${ext}`,
        filePath: `lib/search.${ext}`,
        content: searchClient,
      },
      {
        type: 'env',
        label: 'Add Meilisearch env vars to .env.example',
        vars: {
          MEILISEARCH_HOST: 'http://localhost:7700',
          MEILISEARCH_MASTER_KEY: 'masterkey-change-in-production',
          MEILISEARCH_API_KEY: 'masterkey-change-in-production',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/meilisearch.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start Meilisearch: `docker compose -f docker-compose.meilisearch.yml up -d`',
      'Open Meilisearch dashboard: http://localhost:7700',
      'Create an index and add documents: see lib/search.js',
      'Use the search() helper in your API routes',
      'For production, use Meilisearch Cloud: https://cloud.meilisearch.com',
    ];
  },
};

function docContent(date) {
  return `# Meilisearch Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`meilisearch\` |
| \`docker-compose.meilisearch.yml\` | Meilisearch v1.6 container |
| \`lib/search.js\` | Client, index helpers, search with highlighting |

## Usage
\`\`\`js
import { createIndex, addDocuments, search } from '@/lib/search';

// Setup
await createIndex('products', 'id');

// Index documents
await addDocuments('products', [
  { id: 1, name: 'iPhone 15', category: 'phones', price: 999 },
  { id: 2, name: 'MacBook Pro', category: 'laptops', price: 1999 },
]);

// Search
const results = await search('products', 'macbook', {
  limit: 10,
  filter: 'price < 2000',
  sort: ['price:asc'],
  attributesToHighlight: ['name'],
});
\`\`\`

## Resources
- [Meilisearch Docs](https://www.meilisearch.com/docs)
- [Meilisearch Cloud](https://cloud.meilisearch.com)
`;
}
