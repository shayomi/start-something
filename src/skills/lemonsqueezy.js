import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Lemon Squeezy',
  description: 'Set up Lemon Squeezy billing with checkout, webhooks, and subscription management',
  category: 'Payments',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager, usesAppRouter } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const lsClient = hasTypescript
      ? `import { lemonSqueezySetup, createCheckout, getSubscription, cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import crypto from 'crypto';

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID!;

// ─── Checkout ─────────────────────────────────────────────

export async function createCheckoutSession({
  variantId,
  email,
  name,
  userId,
  redirectUrl,
}: {
  variantId: string;
  email?: string;
  name?: string;
  userId?: string;
  redirectUrl?: string;
}) {
  const { data, error } = await createCheckout(STORE_ID, variantId, {
    checkoutOptions: {
      dark: false,
      embed: false,
    },
    checkoutData: {
      email,
      name,
      custom: userId ? { user_id: userId } : undefined,
    },
    productOptions: {
      redirectUrl,
      receiptButtonText: 'Go to dashboard',
    },
  });

  if (error) throw new Error(error.message);
  return data?.data.attributes.url;
}

// ─── Subscriptions ────────────────────────────────────────

export async function getSubscriptionById(subscriptionId: string) {
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data?.data;
}

export async function cancelSubscriptionById(subscriptionId: string) {
  const { data, error } = await cancelSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data?.data;
}

// ─── Webhook verification ──────────────────────────────────

export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
  const sigBuffer = Buffer.from(signature, 'utf8');
  return crypto.timingSafeEqual(digest, sigBuffer);
}
`
      : `import { lemonSqueezySetup, createCheckout, getSubscription, cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import crypto from 'crypto';

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });

const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;

export async function createCheckoutSession({ variantId, email, name, userId, redirectUrl }) {
  const { data, error } = await createCheckout(STORE_ID, variantId, {
    checkoutData: { email, name, custom: userId ? { user_id: userId } : undefined },
    productOptions: { redirectUrl },
  });
  if (error) throw new Error(error.message);
  return data?.data.attributes.url;
}

export async function getSubscriptionById(subscriptionId) {
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data?.data;
}

export async function cancelSubscriptionById(subscriptionId) {
  const { data, error } = await cancelSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data?.data;
}

export function verifyWebhookSignature(payload, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
  const sigBuffer = Buffer.from(signature, 'utf8');
  return crypto.timingSafeEqual(digest, sigBuffer);
}
`;

    const webhookHandler = `import { verifyWebhookSignature } from '@/lib/lemonsqueezy';

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  if (!verifyWebhookSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { meta, data } = event;

  switch (meta.event_name) {
    case 'order_created':
      console.log('Order created:', data.id);
      // TODO: provision access for the customer
      break;
    case 'subscription_created':
      console.log('Subscription created:', data.id, data.attributes.status);
      break;
    case 'subscription_updated':
      console.log('Subscription updated:', data.id, data.attributes.status);
      break;
    case 'subscription_cancelled':
      console.log('Subscription cancelled:', data.id);
      break;
    case 'subscription_expired':
      console.log('Subscription expired:', data.id);
      // TODO: revoke access
      break;
  }

  return Response.json({ received: true });
}
`;

    const webhookPath = `${appDir}/api/webhooks/lemonsqueezy/route.${ext}`;

    return [
      installStep(packageManager, ['@lemonsqueezy/lemonsqueezy.js']),
      {
        type: 'write',
        label: `Write lib/lemonsqueezy.${ext}`,
        filePath: `lib/lemonsqueezy.${ext}`,
        content: lsClient,
      },
      {
        type: 'write',
        label: `Write ${webhookPath}`,
        filePath: webhookPath,
        content: webhookHandler,
      },
      {
        type: 'env',
        label: 'Add Lemon Squeezy env vars to .env.example',
        vars: {
          LEMONSQUEEZY_API_KEY: 'your-lemonsqueezy-api-key',
          LEMONSQUEEZY_STORE_ID: 'your-store-id',
          LEMONSQUEEZY_WEBHOOK_SECRET: 'your-webhook-secret',
          LEMONSQUEEZY_VARIANT_ID_PRO: 'your-variant-id',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/lemonsqueezy.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create a store at https://app.lemonsqueezy.com',
      'Get your API key: Settings → API → New API Key',
      'Create a product + variant, copy the Variant ID into LEMONSQUEEZY_VARIANT_ID_PRO',
      'Set up a webhook: Settings → Webhooks → New Webhook',
      '  - URL: https://yourdomain.com/api/webhooks/lemonsqueezy',
      '  - Copy the signing secret into LEMONSQUEEZY_WEBHOOK_SECRET',
    ];
  },
};

function docContent(date) {
  return `# Lemon Squeezy Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`@lemonsqueezy/lemonsqueezy.js\` |
| \`lib/lemonsqueezy.js\` | Client, checkout, subscription, webhook verification |
| \`app/api/webhooks/lemonsqueezy/route.js\` | Webhook handler |

## Usage
\`\`\`js
import { createCheckoutSession } from '@/lib/lemonsqueezy';

const checkoutUrl = await createCheckoutSession({
  variantId: process.env.LEMONSQUEEZY_VARIANT_ID_PRO,
  email: user.email,
  userId: user.id,
  redirectUrl: 'https://yourdomain.com/dashboard',
});

redirect(checkoutUrl);
\`\`\`

## Resources
- [Lemon Squeezy Docs](https://docs.lemonsqueezy.com)
- [JS SDK](https://github.com/lemon-squeezy/lemonsqueezy.js)
`;
}
