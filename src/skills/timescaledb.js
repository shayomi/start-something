import { installStep, installDevStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'TimescaleDB',
  description: 'Set up TimescaleDB — time-series Postgres extension with hypertables and compression',
  category: 'Database — SQL (Local)',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  timescaledb:
    image: timescale/timescaledb-ha:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - '5432:5432'
    volumes:
      - timescaledb_data:/home/postgres/pgdata/data

volumes:
  timescaledb_data:
`;

    const dbFile = hasTypescript
      ? `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });

// ─── TimescaleDB helpers ──────────────────────────────────

/**
 * Enable TimescaleDB extension (run once after DB creation)
 */
export async function enableTimescale(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
    console.log('TimescaleDB extension enabled');
  } finally {
    client.release();
  }
}

/**
 * Create a hypertable for time-series data
 */
export async function createHypertable(tableName: string, timeColumn = 'time'): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      \`SELECT create_hypertable('\${tableName}', '\${timeColumn}', if_not_exists => TRUE);\`
    );
    console.log(\`Hypertable created: \${tableName}\`);
  } finally {
    client.release();
  }
}

/**
 * Enable compression on a hypertable (older chunks will be compressed)
 */
export async function enableCompression(tableName: string, segmentBy?: string): Promise<void> {
  const client = await pool.connect();
  try {
    const segmentClause = segmentBy ? \`, timescaledb.compress_segmentby = '\${segmentBy}'\` : '';
    await client.query(\`ALTER TABLE \${tableName} SET (timescaledb.compress\${segmentClause});\`);
    await client.query(\`SELECT add_compression_policy('\${tableName}', INTERVAL '7 days');\`);
    console.log(\`Compression enabled for: \${tableName}\`);
  } finally {
    client.release();
  }
}

export { pool };
`
      : `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function enableTimescale() {
  const client = await pool.connect();
  try { await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'); }
  finally { client.release(); }
}

export async function createHypertable(tableName, timeColumn = 'time') {
  const client = await pool.connect();
  try { await client.query(\`SELECT create_hypertable('\${tableName}', '\${timeColumn}', if_not_exists => TRUE);\`); }
  finally { client.release(); }
}

export async function enableCompression(tableName, segmentBy) {
  const client = await pool.connect();
  try {
    const segmentClause = segmentBy ? \`, timescaledb.compress_segmentby = '\${segmentBy}'\` : '';
    await client.query(\`ALTER TABLE \${tableName} SET (timescaledb.compress\${segmentClause});\`);
    await client.query(\`SELECT add_compression_policy('\${tableName}', INTERVAL '7 days');\`);
  } finally { client.release(); }
}

export { pool };
`;

    const schemaFile = hasTypescript
      ? `import { pgTable, timestamp, text, real, integer } from 'drizzle-orm/pg-core';

// Time-series metrics table (will be a hypertable)
export const metrics = pgTable('metrics', {
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  metricName: text('metric_name').notNull(),
  value: real('value').notNull(),
  tags: text('tags'), // JSON string for flexible tagging
});

// Events table (another hypertable example)
export const events = pgTable('events', {
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  metadata: text('metadata'),
});
`
      : `import { pgTable, timestamp, text, real } from 'drizzle-orm/pg-core';

export const metrics = pgTable('metrics', {
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  metricName: text('metric_name').notNull(),
  value: real('value').notNull(),
  tags: text('tags'),
});

export const events = pgTable('events', {
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  metadata: text('metadata'),
});
`;

    return [
      installStep(packageManager, ['pg', 'drizzle-orm']),
      installDevStep(packageManager, ['drizzle-kit', '@types/pg'], 'Install drizzle-kit, @types/pg (dev)'),
      {
        type: 'write',
        label: 'Write docker-compose.timescaledb.yml',
        filePath: 'docker-compose.timescaledb.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/db.${ext}`,
        filePath: `lib/db.${ext}`,
        content: dbFile,
      },
      {
        type: 'write',
        label: `Write lib/schema.${ext}`,
        filePath: `lib/schema.${ext}`,
        content: schemaFile,
      },
      {
        type: 'env',
        label: 'Add DATABASE_URL to .env.example',
        vars: {
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/myapp',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/timescaledb.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start TimescaleDB: `docker compose -f docker-compose.timescaledb.yml up -d`',
      'Push schema: `npx drizzle-kit push`',
      'Enable the extension and create hypertables at app startup:',
      '  import { enableTimescale, createHypertable } from "@/lib/db";',
      '  await enableTimescale();',
      '  await createHypertable("metrics");',
    ];
  },
};

function docContent(date) {
  return `# TimescaleDB Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`pg\`, \`drizzle-orm\` |
| \`docker-compose.timescaledb.yml\` | TimescaleDB (Postgres 16 + Timescale extension) |
| \`lib/db.js\` | Drizzle client + enableTimescale, createHypertable helpers |
| \`lib/schema.js\` | Example metrics and events hypertables |

## Usage
\`\`\`js
import { enableTimescale, createHypertable, db } from '@/lib/db';
import { metrics } from '@/lib/schema';

// One-time setup
await enableTimescale();
await createHypertable('metrics');

// Insert time-series data
await db.insert(metrics).values({ metricName: 'cpu_usage', value: 72.5 });

// Query with time bucketing (raw SQL for Timescale-specific functions)
const { pool } = await import('@/lib/db');
const { rows } = await pool.query(\`
  SELECT time_bucket('1 hour', time) AS bucket, AVG(value) as avg_value
  FROM metrics WHERE metric_name = 'cpu_usage' AND time > NOW() - INTERVAL '24 hours'
  GROUP BY bucket ORDER BY bucket DESC;
\`);
\`\`\`

## Resources
- [TimescaleDB Docs](https://docs.timescale.com)
- [Timescale Cloud](https://www.timescale.com/cloud)
`;
}
