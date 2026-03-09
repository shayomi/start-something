import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'PocketBase',
  description: 'Set up PocketBase — open-source backend in a single file with DB, auth, and admin UI',
  category: 'Database — Backend Stack',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    // PocketBase doesn't have a published Docker image on Docker Hub, but we can use their binary
    // Alternatively, the community image works fine
    const dockerCompose = `version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    restart: unless-stopped
    ports:
      - '8090:8090'
    volumes:
      - pocketbase_data:/pb/pb_data
      - pocketbase_public:/pb/pb_public

volumes:
  pocketbase_data:
  pocketbase_public:
`;

    const pbClient = hasTypescript
      ? `import PocketBase from 'pocketbase';

// Singleton for server-side usage (Node.js / API routes)
let _pb: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090');
  }
  return _pb;
}

// For client-side usage (always creates a new instance to avoid cross-request contamination)
export function createPocketBase(): PocketBase {
  return new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  );
}

export type { RecordModel } from 'pocketbase';
`
      : `import PocketBase from 'pocketbase';

// Singleton for server-side usage (Node.js / API routes)
let _pb = null;

export function getPocketBase() {
  if (!_pb) {
    _pb = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090');
  }
  return _pb;
}

// For client-side usage (always creates a new instance)
export function createPocketBase() {
  return new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  );
}
`;

    const pbHelpers = hasTypescript
      ? `import { getPocketBase } from './pocketbase';
import type { RecordModel, ListResult } from 'pocketbase';

/** List records from a collection */
export async function list<T = RecordModel>(
  collection: string,
  options: {
    page?: number;
    perPage?: number;
    filter?: string;
    sort?: string;
    expand?: string;
  } = {}
): Promise<ListResult<T>> {
  const pb = getPocketBase();
  return pb.collection(collection).getList<T>(
    options.page ?? 1,
    options.perPage ?? 50,
    {
      filter: options.filter,
      sort: options.sort,
      expand: options.expand,
    }
  );
}

/** Get a single record by ID */
export async function getOne<T = RecordModel>(
  collection: string,
  id: string,
  expand?: string
): Promise<T> {
  const pb = getPocketBase();
  return pb.collection(collection).getOne<T>(id, { expand });
}

/** Create a new record */
export async function create<T = RecordModel>(
  collection: string,
  data: Record<string, unknown>
): Promise<T> {
  const pb = getPocketBase();
  return pb.collection(collection).create<T>(data);
}

/** Update a record */
export async function update<T = RecordModel>(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<T> {
  const pb = getPocketBase();
  return pb.collection(collection).update<T>(id, data);
}

/** Delete a record */
export async function remove(collection: string, id: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection(collection).delete(id);
}
`
      : `import { getPocketBase } from './pocketbase.js';

export async function list(collection, options = {}) {
  const pb = getPocketBase();
  return pb.collection(collection).getList(
    options.page ?? 1,
    options.perPage ?? 50,
    { filter: options.filter, sort: options.sort, expand: options.expand }
  );
}

export async function getOne(collection, id, expand) {
  const pb = getPocketBase();
  return pb.collection(collection).getOne(id, { expand });
}

export async function create(collection, data) {
  const pb = getPocketBase();
  return pb.collection(collection).create(data);
}

export async function update(collection, id, data) {
  const pb = getPocketBase();
  return pb.collection(collection).update(id, data);
}

export async function remove(collection, id) {
  const pb = getPocketBase();
  await pb.collection(collection).delete(id);
}
`;

    return [
      installStep(packageManager, ['pocketbase']),
      {
        type: 'write',
        label: 'Write docker-compose.pocketbase.yml',
        filePath: 'docker-compose.pocketbase.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/pocketbase.${ext}`,
        filePath: `lib/pocketbase.${ext}`,
        content: pbClient,
      },
      {
        type: 'write',
        label: `Write lib/pb-helpers.${ext}`,
        filePath: `lib/pb-helpers.${ext}`,
        content: pbHelpers,
      },
      {
        type: 'env',
        label: 'Add PocketBase env vars to .env.example',
        vars: {
          POCKETBASE_URL: 'http://127.0.0.1:8090',
          NEXT_PUBLIC_POCKETBASE_URL: 'http://127.0.0.1:8090',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/pocketbase.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start PocketBase: `docker compose -f docker-compose.pocketbase.yml up -d`',
      'Open admin UI at http://127.0.0.1:8090/_/ and create your admin account',
      'Create collections in the admin UI (they map directly to API endpoints)',
      'Use lib/pb-helpers for CRUD or getPocketBase() for direct SDK access',
      'For production, deploy PocketBase on Fly.io, Railway, or a VPS',
    ];
  },
};

function docContent(date) {
  return `# PocketBase Setup Guide
> Generated by ai-scaffold on ${date}

## What is PocketBase?
PocketBase is an open-source backend packaged as a single binary. It includes an embedded SQLite database, REST API with real-time subscriptions, auth, file storage, and an admin UI — all out of the box.

## What was set up
| Item | Detail |
|------|--------|
| Package | \`pocketbase\` (JS/TS SDK) |
| \`docker-compose.pocketbase.yml\` | PocketBase container |
| \`lib/pocketbase.js\` | Singleton + browser client factories |
| \`lib/pb-helpers.js\` | CRUD helpers: list, getOne, create, update, remove |

## Environment Variables
| Variable | Description |
|----------|-------------|
| \`POCKETBASE_URL\` | PocketBase server URL (server-side) |
| \`NEXT_PUBLIC_POCKETBASE_URL\` | PocketBase URL (client-side) |

## Usage

### CRUD with helpers
\`\`\`js
import { list, getOne, create, update, remove } from '@/lib/pb-helpers';

// List all posts
const { items, totalItems } = await list('posts', { sort: '-created' });

// Get one
const post = await getOne('posts', postId);

// Create
const newPost = await create('posts', { title: 'Hello', content: 'World' });

// Update
const updated = await update('posts', postId, { title: 'Updated' });

// Delete
await remove('posts', postId);
\`\`\`

### Auth (client-side)
\`\`\`js
import { createPocketBase } from '@/lib/pocketbase';

const pb = createPocketBase();

// Register
await pb.collection('users').create({ email, password, passwordConfirm: password });

// Login
await pb.collection('users').authWithPassword(email, password);

// Current user
const user = pb.authStore.model;

// Logout
pb.authStore.clear();
\`\`\`

### Real-time subscriptions
\`\`\`js
import { createPocketBase } from '@/lib/pocketbase';

const pb = createPocketBase();

// Subscribe to changes in a collection
pb.collection('posts').subscribe('*', (e) => {
  console.log(e.action); // 'create' | 'update' | 'delete'
  console.log(e.record); // the changed record
});

// Unsubscribe
pb.collection('posts').unsubscribe();
\`\`\`

## Docker Commands
\`\`\`bash
# Start
docker compose -f docker-compose.pocketbase.yml up -d

# View logs
docker compose -f docker-compose.pocketbase.yml logs -f

# Stop
docker compose -f docker-compose.pocketbase.yml down
\`\`\`

## Production Deployment
PocketBase runs as a single binary — easy to self-host:
- **Fly.io**: deploy with a Dockerfile (add PocketBase binary)
- **Railway**: deploy using the \`ghcr.io/muchobien/pocketbase\` image
- **VPS**: download binary from https://pocketbase.io/docs and run with \`./pocketbase serve\`

## Production Checklist
- [ ] Mount a persistent volume for pb_data (never store data in container layer)
- [ ] Set a strong admin password
- [ ] Configure email settings for auth emails
- [ ] Set up regular backups of pb_data folder
- [ ] Enable HTTPS in front of PocketBase (Nginx or Caddy)

## Resources
- [PocketBase Docs](https://pocketbase.io/docs)
- [PocketBase JS SDK](https://github.com/pocketbase/js-sdk)
- [PocketBase GitHub](https://github.com/pocketbase/pocketbase)
`;
}
