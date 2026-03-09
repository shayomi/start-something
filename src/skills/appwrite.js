import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Appwrite',
  description: 'Set up Appwrite — open-source Firebase alternative with DB, Auth, Storage, and Functions',
  category: 'Database — Backend Stack',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  appwrite:
    image: appwrite/appwrite:1.5
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    networks:
      - appwrite
    volumes:
      - appwrite-uploads:/storage/uploads
      - appwrite-cache:/storage/cache
      - appwrite-config:/storage/config
      - appwrite-certificates:/storage/certificates
      - appwrite-functions:/storage/functions
    depends_on:
      - mariadb
      - redis
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=your-secret-key-min-32-chars-change-me
      - _APP_DOMAIN=localhost
      - _APP_DOMAIN_TARGET=localhost
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=appwrite
      - _APP_DB_PASS=appwrite_password

  mariadb:
    image: mariadb:10.7
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-mariadb:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=appwrite
      - MYSQL_USER=appwrite
      - MYSQL_PASSWORD=appwrite_password

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-redis:/data

networks:
  appwrite:
    driver: bridge

volumes:
  appwrite-mariadb:
  appwrite-uploads:
  appwrite-cache:
  appwrite-config:
  appwrite-certificates:
  appwrite-functions:
  appwrite-redis:
`;

    const clientFile = hasTypescript
      ? `import { Client, Databases, Account, Storage } from 'node-appwrite';

// Client for server-side SDK (API routes, server components)
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    databases: new Databases(client),
    account: new Account(client),
    storage: new Storage(client),
    client,
  };
}

// Client for browser-side SDK
export function createBrowserClient() {
  const { Client: BrowserClient, Databases: BrowserDatabases, Account: BrowserAccount } =
    require('appwrite') as typeof import('appwrite');

  const client = new BrowserClient()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  return {
    databases: new BrowserDatabases(client),
    account: new BrowserAccount(client),
    client,
  };
}

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? '';
`
      : `import { Client, Databases, Account, Storage } from 'node-appwrite';

// Client for server-side SDK (API routes, server components)
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  return {
    databases: new Databases(client),
    account: new Account(client),
    storage: new Storage(client),
    client,
  };
}

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? '';
`;

    return [
      installStep(packageManager, ['node-appwrite']),
      {
        type: 'write',
        label: 'Write docker-compose.appwrite.yml',
        filePath: 'docker-compose.appwrite.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/appwrite.${ext}`,
        filePath: `lib/appwrite.${ext}`,
        content: clientFile,
      },
      {
        type: 'env',
        label: 'Add Appwrite env vars to .env.example',
        vars: {
          APPWRITE_ENDPOINT: 'http://localhost/v1',
          APPWRITE_PROJECT_ID: 'your-project-id',
          APPWRITE_API_KEY: 'your-api-key',
          APPWRITE_DATABASE_ID: 'your-database-id',
          NEXT_PUBLIC_APPWRITE_ENDPOINT: 'http://localhost/v1',
          NEXT_PUBLIC_APPWRITE_PROJECT_ID: 'your-project-id',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/appwrite.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start Appwrite: `docker compose -f docker-compose.appwrite.yml up -d`',
      'Open http://localhost → create your admin account',
      'Create a project and copy the Project ID into APPWRITE_PROJECT_ID',
      'Go to Settings → API Keys → Create API key → copy into APPWRITE_API_KEY',
      'Create a database and collection in the Appwrite console',
      'Or use Appwrite Cloud (free tier): https://cloud.appwrite.io',
    ];
  },
};

function docContent(date) {
  return `# Appwrite Setup Guide
> Generated by ai-scaffold on ${date}

## What is Appwrite?
Appwrite is an open-source backend-as-a-service with a full suite: database, authentication, storage, serverless functions, and realtime subscriptions. It's a self-hosted Firebase alternative.

## What was set up
| Item | Detail |
|------|--------|
| Package | \`node-appwrite\` (server SDK) |
| \`docker-compose.appwrite.yml\` | Full Appwrite stack (Appwrite + MariaDB + Redis) |
| \`lib/appwrite.js\` | Admin client factory + DATABASE_ID export |

## Environment Variables
| Variable | Description |
|----------|-------------|
| \`APPWRITE_ENDPOINT\` | Appwrite API URL (\`http://localhost/v1\` for local) |
| \`APPWRITE_PROJECT_ID\` | Your project ID |
| \`APPWRITE_API_KEY\` | Server API key (keep secret) |
| \`APPWRITE_DATABASE_ID\` | Your database ID |
| \`NEXT_PUBLIC_APPWRITE_*\` | Client-side public vars |

## Usage

### Server-side queries
\`\`\`js
import { createAdminClient, DATABASE_ID } from '@/lib/appwrite';

const { databases } = createAdminClient();

// List documents
const { documents } = await databases.listDocuments(
  DATABASE_ID,
  'users' // collection ID
);

// Create a document
const doc = await databases.createDocument(
  DATABASE_ID,
  'users',
  'unique()', // or a specific ID
  { name: 'Alice', email: 'alice@example.com' }
);

// Get one document
const user = await databases.getDocument(DATABASE_ID, 'users', documentId);

// Delete a document
await databases.deleteDocument(DATABASE_ID, 'users', documentId);
\`\`\`

### Queries and filtering
\`\`\`js
import { Query } from 'node-appwrite';

const { documents } = await databases.listDocuments(DATABASE_ID, 'users', [
  Query.equal('email', 'alice@example.com'),
  Query.limit(10),
  Query.orderDesc('$createdAt'),
]);
\`\`\`

## Local Docker Stack
\`\`\`bash
# Start Appwrite
docker compose -f docker-compose.appwrite.yml up -d

# View logs
docker compose -f docker-compose.appwrite.yml logs -f appwrite

# Stop
docker compose -f docker-compose.appwrite.yml down
\`\`\`

## Production Checklist
- [ ] Change _APP_OPENSSL_KEY_V1 to a secure 32-char secret
- [ ] Change all default passwords in docker-compose.appwrite.yml
- [ ] Set up a proper domain (update _APP_DOMAIN)
- [ ] Enable HTTPS with a valid SSL certificate
- [ ] Or use Appwrite Cloud: https://cloud.appwrite.io (fully managed)

## Resources
- [Appwrite Docs](https://appwrite.io/docs)
- [Appwrite Cloud](https://cloud.appwrite.io)
- [Appwrite Node.js SDK](https://appwrite.io/docs/sdks#server)
- [Appwrite Discord](https://appwrite.io/discord)
`;
}
