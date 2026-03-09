import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'PostHog',
  description: 'Set up PostHog product analytics with feature flags, session recording, and event tracking',
  category: 'Analytics',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager, framework } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const isNext = framework === 'nextjs';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const posthogClient = hasTypescript
      ? `'use client';
import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) url += '?' + searchParams.toString();
      posthog.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false, // we handle this manually above
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
    },
  });
}
`
      : `'use client';
import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) url += '?' + searchParams.toString();
      posthog.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
    },
  });
}
`;

    const analyticsHelpers = hasTypescript
      ? `import posthog from 'posthog-js';

/** Track a custom event */
export function track(event: string, properties?: Record<string, unknown>): void {
  posthog.capture(event, properties);
}

/** Identify a logged-in user */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  posthog.identify(userId, traits);
}

/** Reset the user identity (on logout) */
export function reset(): void {
  posthog.reset();
}

/** Check if a feature flag is enabled */
export function isFeatureEnabled(flag: string): boolean {
  return posthog.isFeatureEnabled(flag) ?? false;
}

/** Get a feature flag payload */
export function getFeatureFlag(flag: string): string | boolean | undefined {
  return posthog.getFeatureFlag(flag);
}
`
      : `import posthog from 'posthog-js';

export function track(event, properties) {
  posthog.capture(event, properties);
}

export function identify(userId, traits) {
  posthog.identify(userId, traits);
}

export function reset() {
  posthog.reset();
}

export function isFeatureEnabled(flag) {
  return posthog.isFeatureEnabled(flag) ?? false;
}

export function getFeatureFlag(flag) {
  return posthog.getFeatureFlag(flag);
}
`;

    const providerFile = `'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
      },
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
`;

    return [
      installStep(packageManager, ['posthog-js']),
      {
        type: 'write',
        label: `Write lib/posthog.${ext}x`,
        filePath: `lib/posthog.${ext}x`,
        content: posthogClient,
      },
      {
        type: 'write',
        label: `Write lib/analytics.${ext}`,
        filePath: `lib/analytics.${ext}`,
        content: analyticsHelpers,
      },
      {
        type: 'write',
        label: `Write components/PHProvider.${ext}x`,
        filePath: `components/PHProvider.${ext}x`,
        content: providerFile,
      },
      {
        type: 'env',
        label: 'Add PostHog env vars to .env.example',
        vars: {
          NEXT_PUBLIC_POSTHOG_KEY: 'phc_your-posthog-project-key',
          NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/posthog.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create a project at https://posthog.com (generous free tier)',
      'Copy your Project API Key from PostHog → Project Settings',
      'Set NEXT_PUBLIC_POSTHOG_KEY in .env',
      'Wrap your root layout with <PHProvider> from components/PHProvider',
      'Add <PostHogPageView /> inside PHProvider for automatic pageviews',
      'Use track(), identify(), isFeatureEnabled() from lib/analytics',
    ];
  },
};

function docContent(date) {
  return `# PostHog Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`posthog-js\` |
| \`lib/posthog.jsx\` | PostHogPageView component + initPostHog |
| \`lib/analytics.js\` | track, identify, reset, isFeatureEnabled helpers |
| \`components/PHProvider.jsx\` | PostHog provider wrapper for layout |

## Usage

### Wrap your layout
\`\`\`jsx
// app/layout.js
import { PHProvider } from '@/components/PHProvider';
import { PostHogPageView } from '@/lib/posthog';
import { Suspense } from 'react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PHProvider>
          <Suspense><PostHogPageView /></Suspense>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
\`\`\`

### Track events
\`\`\`js
import { track, identify } from '@/lib/analytics';

// Track an action
track('button_clicked', { button: 'cta_hero', plan: 'pro' });

// Identify a user after login
identify(user.id, { email: user.email, plan: user.plan });
\`\`\`

### Feature flags
\`\`\`js
import { isFeatureEnabled } from '@/lib/analytics';

if (isFeatureEnabled('new-dashboard')) {
  // show new feature
}
\`\`\`

## Resources
- [PostHog Docs](https://posthog.com/docs)
- [Next.js Integration](https://posthog.com/docs/libraries/next-js)
- [Feature Flags](https://posthog.com/docs/feature-flags)
`;
}
