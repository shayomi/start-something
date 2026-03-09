import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Inngest',
  description: 'Set up Inngest serverless background functions — no Redis, durable workflows, retries',
  category: 'Background Jobs',
  supportedFrameworks: ['nextjs', 'express'],

  steps(context) {
    const { hasTypescript, packageManager, framework } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const isNext = framework === 'nextjs';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const inngestClient = hasTypescript
      ? `import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'my-app' });
`
      : `import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'my-app' });
`;

    const functionsFile = hasTypescript
      ? `import { inngest } from './inngest';

// ─── Welcome email function ───────────────────────────────

export const sendWelcomeEmail = inngest.createFunction(
  {
    id: 'send-welcome-email',
    retries: 3,
  },
  { event: 'user/signed-up' },
  async ({ event, step }) => {
    const { email, name } = event.data;

    // Each step is independently retried and cached
    await step.run('send-email', async () => {
      // TODO: call your email provider
      console.log(\`Sending welcome email to \${email}\`);
    });

    await step.sleep('wait-before-followup', '3d');

    await step.run('send-followup', async () => {
      console.log(\`Sending 3-day followup to \${email}\`);
    });

    return { sent: true, email };
  }
);

// ─── Scheduled function (cron) ────────────────────────────

export const dailyDigest = inngest.createFunction(
  { id: 'daily-digest' },
  { cron: '0 9 * * *' }, // every day at 9am UTC
  async ({ step }) => {
    await step.run('send-digests', async () => {
      console.log('Sending daily digest emails...');
    });
  }
);

// ─── Fan-out function ─────────────────────────────────────

export const processUserBatch = inngest.createFunction(
  { id: 'process-user-batch', concurrency: 10 },
  { event: 'batch/process' },
  async ({ event, step }) => {
    const { userIds } = event.data as { userIds: string[] };

    await Promise.all(
      userIds.map((userId) =>
        step.run(\`process-user-\${userId}\`, async () => {
          console.log(\`Processing user \${userId}\`);
        })
      )
    );
  }
);

export const functions = [sendWelcomeEmail, dailyDigest, processUserBatch];
`
      : `import { inngest } from './inngest.js';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email', retries: 3 },
  { event: 'user/signed-up' },
  async ({ event, step }) => {
    const { email, name } = event.data;

    await step.run('send-email', async () => {
      console.log(\`Sending welcome email to \${email}\`);
    });

    await step.sleep('wait-before-followup', '3d');

    await step.run('send-followup', async () => {
      console.log(\`Sending 3-day followup to \${email}\`);
    });

    return { sent: true, email };
  }
);

export const dailyDigest = inngest.createFunction(
  { id: 'daily-digest' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    await step.run('send-digests', async () => {
      console.log('Sending daily digest emails...');
    });
  }
);

export const functions = [sendWelcomeEmail, dailyDigest];
`;

    const routeHandler = isNext
      ? `import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { functions } from '@/lib/inngest-functions';

export const { GET, POST, PUT } = serve({ client: inngest, functions });
`
      : `import { serve } from 'inngest/express';
import express from 'express';
import { inngest } from './lib/inngest.js';
import { functions } from './lib/inngest-functions.js';

const app = express();
app.use('/api/inngest', serve({ client: inngest, functions }));
`;

    const routePath = isNext
      ? `${appDir}/api/inngest/route.${ext}`
      : `inngest-server.${ext}`;

    return [
      installStep(packageManager, ['inngest']),
      {
        type: 'write',
        label: `Write lib/inngest.${ext}`,
        filePath: `lib/inngest.${ext}`,
        content: inngestClient,
      },
      {
        type: 'write',
        label: `Write lib/inngest-functions.${ext}`,
        filePath: `lib/inngest-functions.${ext}`,
        content: functionsFile,
      },
      {
        type: 'write',
        label: `Write ${routePath}`,
        filePath: routePath,
        content: routeHandler,
      },
      {
        type: 'env',
        label: 'Add Inngest env vars to .env.example',
        vars: {
          INNGEST_EVENT_KEY: 'your-inngest-event-key',
          INNGEST_SIGNING_KEY: 'your-inngest-signing-key',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/inngest.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create an account at https://inngest.com (free tier available)',
      'Run the Inngest dev server: `npx inngest-cli@latest dev`',
      'Your functions will auto-register at http://localhost:8288',
      'Send a test event from the Inngest dashboard or CLI',
      'Import { inngest } from "@/lib/inngest" and call inngest.send() to trigger events',
    ];
  },
};

function docContent(date) {
  return `# Inngest Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`inngest\` |
| \`lib/inngest.js\` | Inngest client |
| \`lib/inngest-functions.js\` | sendWelcomeEmail, dailyDigest, processUserBatch functions |
| \`app/api/inngest/route.js\` | Inngest API route handler |

## Usage

### Send an event
\`\`\`js
import { inngest } from '@/lib/inngest';

await inngest.send({
  name: 'user/signed-up',
  data: { email: 'alice@example.com', name: 'Alice' },
});
\`\`\`

### Local development
\`\`\`bash
npx inngest-cli@latest dev
# Connect at: http://localhost:8288
\`\`\`

## Resources
- [Inngest Docs](https://www.inngest.com/docs)
- [Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)
`;
}
