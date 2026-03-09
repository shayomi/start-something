import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Trigger.dev',
  description: 'Set up Trigger.dev background job orchestration — durable tasks, long-running jobs, event-driven',
  category: 'Background Jobs',
  supportedFrameworks: ['nextjs', 'express'],

  steps(context) {
    const { hasTypescript, packageManager, framework } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const isNext = framework === 'nextjs';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const triggerClient = hasTypescript
      ? `import { TriggerClient } from '@trigger.dev/sdk';

export const client = new TriggerClient({
  id: 'my-app',
  apiKey: process.env.TRIGGER_API_KEY!,
  apiUrl: process.env.TRIGGER_API_URL,
});
`
      : `import { TriggerClient } from '@trigger.dev/sdk';

export const client = new TriggerClient({
  id: 'my-app',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});
`;

    const jobsFile = hasTypescript
      ? `import { eventTrigger, cronTrigger, intervalTrigger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { client } from './trigger';

// ─── Event-triggered job ──────────────────────────────────

export const welcomeEmailJob = client.defineJob({
  id: 'send-welcome-email',
  name: 'Send Welcome Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'user.signup',
    schema: z.object({
      userId: z.string(),
      email: z.string().email(),
      name: z.string(),
    }),
  }),
  run: async (payload, io) => {
    await io.logger.info('Sending welcome email', { email: payload.email });

    // Simulate sending email
    await io.wait('delay', 1); // 1 second

    await io.logger.info('Welcome email sent!');
    return { success: true, email: payload.email };
  },
});

// ─── Cron job ─────────────────────────────────────────────

export const dailyReportJob = client.defineJob({
  id: 'daily-report',
  name: 'Daily Report',
  version: '1.0.0',
  trigger: cronTrigger({ cron: '0 9 * * *' }), // every day at 9am UTC
  run: async (payload, io) => {
    await io.logger.info('Generating daily report...');
    // TODO: generate and send report
    return { generatedAt: new Date().toISOString() };
  },
});

// ─── Interval job ─────────────────────────────────────────

export const heartbeatJob = client.defineJob({
  id: 'heartbeat',
  name: 'Heartbeat Check',
  version: '1.0.0',
  trigger: intervalTrigger({ seconds: 60 }),
  run: async (payload, io) => {
    await io.logger.info('Heartbeat OK');
    return { timestamp: payload.ts };
  },
});
`
      : `import { eventTrigger, cronTrigger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { client } from './trigger.js';

export const welcomeEmailJob = client.defineJob({
  id: 'send-welcome-email',
  name: 'Send Welcome Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'user.signup',
    schema: z.object({
      userId: z.string(),
      email: z.string().email(),
      name: z.string(),
    }),
  }),
  run: async (payload, io) => {
    await io.logger.info('Sending welcome email', { email: payload.email });
    await io.wait('delay', 1);
    await io.logger.info('Welcome email sent!');
    return { success: true };
  },
});

export const dailyReportJob = client.defineJob({
  id: 'daily-report',
  name: 'Daily Report',
  version: '1.0.0',
  trigger: cronTrigger({ cron: '0 9 * * *' }),
  run: async (payload, io) => {
    await io.logger.info('Generating daily report...');
    return { generatedAt: new Date().toISOString() };
  },
});
`;

    const routeHandler = isNext
      ? `import { createPageRoute } from '@trigger.dev/nextjs';
import { client } from '@/lib/trigger';
import '@/jobs'; // import all job definitions

export const { GET, POST } = createPageRoute(client);
`
      : `import { createExpressServer } from '@trigger.dev/express';
import { client } from './lib/trigger.js';
import './jobs/index.js';

export const triggerRouter = createExpressServer(client);
`;

    const routePath = isNext
      ? `${appDir}/api/trigger/route.${ext}`
      : `trigger-server.${ext}`;

    return [
      installStep(packageManager, ['@trigger.dev/sdk']),
      {
        type: 'write',
        label: `Write lib/trigger.${ext}`,
        filePath: `lib/trigger.${ext}`,
        content: triggerClient,
      },
      {
        type: 'write',
        label: `Write jobs/index.${ext}`,
        filePath: `jobs/index.${ext}`,
        content: jobsFile,
      },
      {
        type: 'write',
        label: `Write ${routePath}`,
        filePath: routePath,
        content: routeHandler,
      },
      {
        type: 'env',
        label: 'Add Trigger.dev env vars to .env.example',
        vars: {
          TRIGGER_API_KEY: 'tr_dev_your-api-key',
          TRIGGER_API_URL: 'https://api.trigger.dev',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/trigger-dev.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create an account at https://trigger.dev (free tier available)',
      'Get your API key from Trigger.dev → Project Settings → Environments',
      'Set TRIGGER_API_KEY in .env',
      'Run the Trigger.dev dev CLI: `npx @trigger.dev/cli@latest dev`',
      'Trigger a job: `npx @trigger.dev/cli@latest send-event user.signup --payload \'{"userId":"1","email":"test@example.com","name":"Test"}\'`',
    ];
  },
};

function docContent(date) {
  return `# Trigger.dev Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`@trigger.dev/sdk\` |
| \`lib/trigger.js\` | TriggerClient instance |
| \`jobs/index.js\` | welcomeEmailJob (event), dailyReportJob (cron), heartbeatJob (interval) |
| \`app/api/trigger/route.js\` | Trigger.dev API route |

## Usage

### Send an event
\`\`\`js
import { client } from '@/lib/trigger';

await client.sendEvent({
  name: 'user.signup',
  payload: { userId: '123', email: 'alice@example.com', name: 'Alice' },
});
\`\`\`

### Local development
\`\`\`bash
npx @trigger.dev/cli@latest dev
\`\`\`

## Resources
- [Trigger.dev Docs](https://trigger.dev/docs)
- [Next.js Integration](https://trigger.dev/docs/documentation/guides/nextjs)
`;
}
