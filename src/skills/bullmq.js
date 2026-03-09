import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'BullMQ',
  description: 'Set up BullMQ Redis-backed job queues — background workers, retries, cron, and concurrency',
  category: 'Background Jobs',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const queueFile = hasTypescript
      ? `import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// ─── Connection ───────────────────────────────────────────

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required for BullMQ
});

// ─── Queues ───────────────────────────────────────────────

export const emailQueue = new Queue('email', { connection });
export const imageQueue = new Queue('image-processing', { connection });
export const notificationQueue = new Queue('notifications', { connection });

// ─── Job types ────────────────────────────────────────────

export interface SendEmailJob {
  to: string;
  subject: string;
  text: string;
}

export interface ProcessImageJob {
  imageUrl: string;
  userId: string;
  outputFormat?: 'webp' | 'jpeg' | 'png';
}

// ─── Add jobs ─────────────────────────────────────────────

export async function queueEmail(data: SendEmailJob, opts?: { delay?: number }) {
  return emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    delay: opts?.delay,
  });
}

export async function queueImageProcessing(data: ProcessImageJob) {
  return imageQueue.add('process-image', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}

// ─── Cron jobs ────────────────────────────────────────────

export async function scheduleDailyDigest() {
  await emailQueue.add(
    'daily-digest',
    { type: 'digest' },
    {
      repeat: { pattern: '0 9 * * *' }, // every day at 9am
      jobId: 'daily-digest', // prevents duplicates
    }
  );
}
`
      : `import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('email', { connection });
export const imageQueue = new Queue('image-processing', { connection });
export const notificationQueue = new Queue('notifications', { connection });

export async function queueEmail(data, opts = {}) {
  return emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    delay: opts.delay,
  });
}

export async function queueImageProcessing(data) {
  return imageQueue.add('process-image', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}

export async function scheduleDailyDigest() {
  await emailQueue.add(
    'daily-digest',
    { type: 'digest' },
    {
      repeat: { pattern: '0 9 * * *' },
      jobId: 'daily-digest',
    }
  );
}
`;

    const workerFile = hasTypescript
      ? `import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Email worker ─────────────────────────────────────────

const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    console.log(\`[email-worker] Processing job \${job.id}: \${job.name}\`);

    switch (job.name) {
      case 'send-email': {
        const { to, subject, text } = job.data;
        // TODO: integrate your email provider here (Resend, Postmark, etc.)
        console.log(\`Sending email to \${to}: \${subject}\`);
        break;
      }
      case 'daily-digest': {
        console.log('Sending daily digest emails...');
        break;
      }
      default:
        console.warn('Unknown job name:', job.name);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => console.log(\`Job \${job.id} completed\`));
emailWorker.on('failed', (job, err) => console.error(\`Job \${job?.id} failed:\`, err));

// ─── Image worker ─────────────────────────────────────────

const imageWorker = new Worker(
  'image-processing',
  async (job: Job) => {
    console.log(\`[image-worker] Processing: \${job.data.imageUrl}\`);
    // TODO: implement image processing (sharp, cloudinary, etc.)
  },
  { connection, concurrency: 2 }
);

imageWorker.on('failed', (job, err) => console.error(\`Image job \${job?.id} failed:\`, err));

console.log('Workers started. Waiting for jobs...');
`
      : `import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const emailWorker = new Worker(
  'email',
  async (job) => {
    console.log(\`[email-worker] Processing job \${job.id}: \${job.name}\`);
    switch (job.name) {
      case 'send-email': {
        const { to, subject, text } = job.data;
        console.log(\`Sending email to \${to}: \${subject}\`);
        break;
      }
      case 'daily-digest':
        console.log('Sending daily digest emails...');
        break;
    }
  },
  { connection, concurrency: 5 }
);

emailWorker.on('completed', (job) => console.log(\`Job \${job.id} completed\`));
emailWorker.on('failed', (job, err) => console.error(\`Job \${job?.id} failed:\`, err));

const imageWorker = new Worker(
  'image-processing',
  async (job) => {
    console.log(\`[image-worker] Processing: \${job.data.imageUrl}\`);
    // TODO: implement image processing
  },
  { connection, concurrency: 2 }
);

console.log('Workers started. Waiting for jobs...');
`;

    return [
      installStep(packageManager, ['bullmq', 'ioredis']),
      {
        type: 'write',
        label: `Write lib/queues.${ext}`,
        filePath: `lib/queues.${ext}`,
        content: queueFile,
      },
      {
        type: 'write',
        label: `Write workers/index.${ext}`,
        filePath: `workers/index.${ext}`,
        content: workerFile,
      },
      {
        type: 'env',
        label: 'Add Redis env var to .env.example',
        vars: {
          REDIS_URL: 'redis://localhost:6379',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/bullmq.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start Redis: `docker compose -f docker-compose.redis.yml up -d` (or use `just-start-dude setup redis-local`)',
      'Start your worker: `node workers/index.js`',
      'Add jobs from your app: `import { queueEmail } from "@/lib/queues"`',
      'Monitor jobs with Bull Board: `npm install @bull-board/express`',
      'In production, run workers in a separate process/container',
    ];
  },
};

function docContent(date) {
  return `# BullMQ Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`bullmq\`, \`ioredis\` |
| \`lib/queues.js\` | Queue definitions, job adders, cron scheduling |
| \`workers/index.js\` | Worker processes for email and image queues |

## Usage

### Add a job
\`\`\`js
import { queueEmail } from '@/lib/queues';

// Add immediately
await queueEmail({ to: 'user@example.com', subject: 'Hello', text: 'World' });

// Add with 5-minute delay
await queueEmail({ to: 'user@example.com', subject: 'Reminder' }, { delay: 5 * 60 * 1000 });
\`\`\`

### Define a custom queue
\`\`\`js
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);
export const myQueue = new Queue('my-queue', { connection });
await myQueue.add('task', { data: 'value' }, { attempts: 3 });
\`\`\`

### Start workers
\`\`\`bash
node workers/index.js
# or in production:
pm2 start workers/index.js --name workers
\`\`\`

### Cron jobs
\`\`\`js
import { scheduleDailyDigest } from '@/lib/queues';
await scheduleDailyDigest(); // call once at startup
\`\`\`

## Monitoring with Bull Board
\`\`\`bash
npm install @bull-board/express @bull-board/api
\`\`\`
\`\`\`js
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());
\`\`\`

## Resources
- [BullMQ Docs](https://docs.bullmq.io)
- [Bull Board](https://github.com/felixmosh/bull-board)
- [BullMQ Patterns](https://docs.bullmq.io/patterns/adding-jobs-in-bulk)
`;
}
