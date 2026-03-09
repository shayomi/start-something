import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Sentry',
  description: 'Set up Sentry error monitoring with source maps, performance tracing, and session replay',
  category: 'Observability',
  supportedFrameworks: ['nextjs', 'react', 'express', 'fastify'],

  steps(context) {
    const { hasTypescript, framework, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const isNext = framework === 'nextjs';

    const sentryClient = isNext
      ? `// sentry.client.config.${ext}
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
  // Silence common noise in development
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') return null;
    return event;
  },
});
`
      : `import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],
});

export { Sentry };
`;

    const sentryServer = isNext
      ? `// sentry.server.config.${ext}
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
`
      : null;

    const sentryEdge = isNext
      ? `// sentry.edge.config.${ext}
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
`
      : null;

    const errorHelpers = hasTypescript
      ? `import * as Sentry from '${isNext ? '@sentry/nextjs' : '@sentry/node'}';

/** Capture an error with optional context */
export function captureError(error: unknown, context?: Record<string, unknown>): string {
  return Sentry.captureException(error, { extra: context });
}

/** Capture a message (info/warning) */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string {
  return Sentry.captureMessage(message, { level, extra: context });
}

/** Set user context for better error attribution */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/** Add breadcrumb for tracing user actions */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}
`
      : `import * as Sentry from '${isNext ? '@sentry/nextjs' : '@sentry/node'}';

export function captureError(error, context) {
  return Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info', context) {
  return Sentry.captureMessage(message, { level, extra: context });
}

export function setUser(user) {
  Sentry.setUser(user);
}

export function addBreadcrumb(message, category, data) {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}
`;

    const pkg = isNext ? '@sentry/nextjs' : framework === 'express' ? '@sentry/node' : '@sentry/node';

    const steps = [
      installStep(packageManager, [pkg]),
      {
        type: 'write',
        label: `Write lib/sentry.${ext}`,
        filePath: `lib/sentry.${ext}`,
        content: errorHelpers,
      },
    ];

    if (isNext) {
      steps.push(
        {
          type: 'write',
          label: `Write sentry.client.config.${ext}`,
          filePath: `sentry.client.config.${ext}`,
          content: sentryClient,
        },
        {
          type: 'write',
          label: `Write sentry.server.config.${ext}`,
          filePath: `sentry.server.config.${ext}`,
          content: sentryServer,
        },
        {
          type: 'write',
          label: `Write sentry.edge.config.${ext}`,
          filePath: `sentry.edge.config.${ext}`,
          content: sentryEdge,
        }
      );
    } else {
      steps.push({
        type: 'write',
        label: `Write sentry.config.${ext}`,
        filePath: `sentry.config.${ext}`,
        content: sentryClient,
      });
    }

    steps.push(
      {
        type: 'env',
        label: 'Add Sentry env vars to .env.example',
        vars: isNext
          ? {
              NEXT_PUBLIC_SENTRY_DSN: 'https://your-dsn@sentry.io/project-id',
              SENTRY_ORG: 'your-org',
              SENTRY_PROJECT: 'your-project',
              SENTRY_AUTH_TOKEN: 'your-auth-token',
            }
          : {
              SENTRY_DSN: 'https://your-dsn@sentry.io/project-id',
              SENTRY_AUTH_TOKEN: 'your-auth-token',
            },
      },
      {
        type: 'doc',
        label: 'Write docs/sentry.md',
        content: docContent(DATE, isNext),
      }
    );

    return steps;
  },

  nextSteps() {
    return [
      'Create a project at https://sentry.io',
      'Copy your DSN from: Project Settings → Client Keys (DSN)',
      'Set SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN) in .env',
      'For source maps: get auth token from Sentry → Settings → Auth Tokens',
      'Import { captureError } from "@/lib/sentry" to manually report errors',
      'Errors thrown in your app will be captured automatically',
    ];
  },
};

function docContent(date, isNext) {
  return `# Sentry Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`${isNext ? '@sentry/nextjs' : '@sentry/node'}\` |
| \`lib/sentry.js\` | captureError, captureMessage, setUser helpers |
${isNext ? `| \`sentry.client.config.js\` | Client-side Sentry init (Session Replay) |
| \`sentry.server.config.js\` | Server-side Sentry init |
| \`sentry.edge.config.js\` | Edge runtime Sentry init |` : `| \`sentry.config.js\` | Sentry initialization |`}

## Usage

### Manual error capture
\`\`\`js
import { captureError, captureMessage, setUser } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (err) {
  captureError(err, { userId: '123', action: 'payment' });
  throw err; // re-throw for the UI to handle
}

// Log a message
captureMessage('Payment completed', 'info', { amount: 99 });

// Set user for better attribution
setUser({ id: user.id, email: user.email });
\`\`\`

## Production Checklist
- [ ] Set SENTRY_DSN in your hosting environment
- [ ] Set SENTRY_AUTH_TOKEN for source map uploads
- [ ] Adjust tracesSampleRate (0.1 = 10% in production)
- [ ] Set up alerts in Sentry for critical errors
- [ ] Review and configure performance thresholds

## Resources
- [Sentry Docs](https://docs.sentry.io)
- [Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs)
- [Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps)
`;
}
