import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Typesense',
  description: 'Set up Typesense fast search engine — local Docker or Typesense Cloud',
  category: 'Search',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  typesense:
    image: typesense/typesense:0.25.2
    restart: unless-stopped
    ports:
      - '8108:8108'
    volumes:
      - typesense_data:/data
    command: '--data-dir /data --api-key=\${TYPESENSE_API_KEY:-changeme-api-key} --enable-cors'

volumes:
  typesense_data:
`;

    const tsClient = hasTypescript
      ? `import Typesense from 'typesense';

export const typesense = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT ?? '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 5,
});

// ─── Collection management ────────────────────────────────

export async function createCollection(schema: Typesense.CollectionCreateSchema) {
  try {
    return await typesense.collections().create(schema);
  } catch (err: any) {
    if (err.httpStatus === 409) {
      console.log(\`Collection \${schema.name} already exists\`);
      return null;
    }
    throw err;
  }
}

// ─── Documents ────────────────────────────────────────────

export async function indexDocuments<T extends Record<string, unknown>>(
  collectionName: string,
  documents: T[]
): Promise<void> {
  await typesense.collections(collectionName).documents().import(documents, { action: 'upsert' });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await typesense.collections(collectionName).documents(id).delete();
}

// ─── Search ───────────────────────────────────────────────

export async function search(
  collectionName: string,
  query: string,
  options: {
    queryBy: string | string[];
    filterBy?: string;
    sortBy?: string;
    perPage?: number;
    page?: number;
    highlightFields?: string | string[];
  }
) {
  return typesense.collections(collectionName).documents().search({
    q: query,
    query_by: Array.isArray(options.queryBy) ? options.queryBy.join(',') : options.queryBy,
    filter_by: options.filterBy,
    sort_by: options.sortBy,
    per_page: options.perPage ?? 20,
    page: options.page ?? 1,
    highlight_fields: options.highlightFields
      ? Array.isArray(options.highlightFields) ? options.highlightFields.join(',') : options.highlightFields
      : undefined,
  });
}
`
      : `import Typesense from 'typesense';

export const typesense = new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST ?? 'localhost', port: parseInt(process.env.TYPESENSE_PORT ?? '8108'), protocol: 'http' }],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5,
});

export async function createCollection(schema) {
  try { return await typesense.collections().create(schema); }
  catch (err) { if (err.httpStatus === 409) return null; throw err; }
}

export async function indexDocuments(collectionName, documents) {
  await typesense.collections(collectionName).documents().import(documents, { action: 'upsert' });
}

export async function deleteDocument(collectionName, id) {
  await typesense.collections(collectionName).documents(id).delete();
}

export async function search(collectionName, query, options) {
  return typesense.collections(collectionName).documents().search({
    q: query,
    query_by: Array.isArray(options.queryBy) ? options.queryBy.join(',') : options.queryBy,
    filter_by: options.filterBy,
    sort_by: options.sortBy,
    per_page: options.perPage ?? 20,
    page: options.page ?? 1,
  });
}
`;

    return [
      installStep(packageManager, ['typesense']),
      {
        type: 'write',
        label: 'Write docker-compose.typesense.yml',
        filePath: 'docker-compose.typesense.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/typesense.${ext}`,
        filePath: `lib/typesense.${ext}`,
        content: tsClient,
      },
      {
        type: 'env',
        label: 'Add Typesense env vars to .env.example',
        vars: {
          TYPESENSE_HOST: 'localhost',
          TYPESENSE_PORT: '8108',
          TYPESENSE_PROTOCOL: 'http',
          TYPESENSE_API_KEY: 'changeme-api-key',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/typesense.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start Typesense: `docker compose -f docker-compose.typesense.yml up -d`',
      'Create a collection schema and index your documents',
      'Use search() from lib/typesense in your API routes',
      'For production use Typesense Cloud: https://cloud.typesense.org',
    ];
  },
};

function docContent(date) {
  return `# Typesense Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`typesense\` |
| \`docker-compose.typesense.yml\` | Typesense container |
| \`lib/typesense.js\` | Client, collection, index, search helpers |

## Usage
\`\`\`js
import { createCollection, indexDocuments, search } from '@/lib/typesense';

await createCollection({
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'price', type: 'float' },
  ],
  default_sorting_field: 'price',
});

await indexDocuments('products', [{ id: '1', name: 'iPhone', price: 999 }]);

const results = await search('products', 'iphone', {
  queryBy: ['name'],
  filterBy: 'price:<1000',
  sortBy: 'price:asc',
});
\`\`\`

## Resources
- [Typesense Docs](https://typesense.org/docs)
- [Typesense Cloud](https://cloud.typesense.org)
`;
}
