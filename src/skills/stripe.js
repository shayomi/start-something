import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Stripe',
  description: 'Set up Stripe billing with checkout, webhooks, customer portal, and subscription helpers',
  category: 'Payments',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager, usesAppRouter } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const stripeClient = hasTypescript
      ? `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// ─── Checkout ─────────────────────────────────────────────

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: { metadata },
  });
}

// ─── Customer Portal ───────────────────────────────────────

export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ─── Customers ────────────────────────────────────────────

export async function createOrRetrieveCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length > 0) return list.data[0];
  return stripe.customers.create({ email, name, metadata });
}

// ─── Webhook verification ──────────────────────────────────

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
`
      : `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export async function createCheckoutSession({ priceId, customerId, successUrl, cancelUrl, metadata = {} }) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: { metadata },
  });
}

export async function createPortalSession(customerId, returnUrl) {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export async function createOrRetrieveCustomer({ email, name, metadata = {} }) {
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length > 0) return list.data[0];
  return stripe.customers.create({ email, name, metadata });
}

export function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
`;

    const webhookHandler = usesAppRouter
      ? `import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import type Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO: provision access for the customer
      console.log('Checkout completed:', session.id);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // TODO: update subscription status in your DB
      console.log('Subscription changed:', subscription.id, subscription.status);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO: notify the customer
      console.log('Payment failed:', invoice.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
`
      : `// pages/api/webhooks/stripe.js
import { buffer } from 'micro';
import { constructWebhookEvent } from '../../lib/stripe.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const buf = await buffer(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(buf, signature);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('Checkout completed:', event.data.object.id);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      console.log('Subscription changed:', event.data.object.id);
      break;
    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;
  }

  res.json({ received: true });
}
`;

    const webhookPath = usesAppRouter
      ? `${appDir}/api/webhooks/stripe/route.${ext}`
      : `pages/api/webhooks/stripe.${ext}`;

    return [
      installStep(packageManager, ['stripe']),
      {
        type: 'write',
        label: `Write lib/stripe.${ext}`,
        filePath: `lib/stripe.${ext}`,
        content: stripeClient,
      },
      {
        type: 'write',
        label: `Write ${webhookPath}`,
        filePath: webhookPath,
        content: webhookHandler,
      },
      {
        type: 'env',
        label: 'Add Stripe env vars to .env.example',
        vars: {
          STRIPE_SECRET_KEY: 'sk_test_your-stripe-secret-key',
          STRIPE_PUBLISHABLE_KEY: 'pk_test_your-stripe-publishable-key',
          STRIPE_WEBHOOK_SECRET: 'whsec_your-webhook-secret',
          STRIPE_PRICE_ID_PRO: 'price_your-price-id',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/stripe.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create a Stripe account at https://stripe.com',
      'Copy your Secret Key and Publishable Key from Stripe Dashboard → Developers → API Keys',
      'Create a product + price in Stripe Dashboard → Products, copy Price ID into STRIPE_PRICE_ID_PRO',
      'Set up a webhook endpoint: Stripe Dashboard → Webhooks → Add endpoint',
      '  - URL: https://yourdomain.com/api/webhooks/stripe',
      '  - Events: checkout.session.completed, customer.subscription.*, invoice.payment_failed',
      'Copy the webhook signing secret into STRIPE_WEBHOOK_SECRET',
      'Test webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`',
    ];
  },
};

function docContent(date) {
  return `# Stripe Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Package | \`stripe\` |
| \`lib/stripe.js\` | Stripe client + checkout, portal, customer helpers |
| \`app/api/webhooks/stripe/route.js\` | Webhook handler for billing events |

## Environment Variables
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| \`STRIPE_SECRET_KEY\` | Secret key | Stripe Dashboard → Developers → API Keys |
| \`STRIPE_PUBLISHABLE_KEY\` | Publishable key | Same |
| \`STRIPE_WEBHOOK_SECRET\` | Webhook signing secret | Stripe Dashboard → Webhooks |
| \`STRIPE_PRICE_ID_PRO\` | Price ID for your plan | Stripe Dashboard → Products |

## Usage

### Create a checkout session
\`\`\`js
import { createCheckoutSession } from '@/lib/stripe';

const session = await createCheckoutSession({
  priceId: process.env.STRIPE_PRICE_ID_PRO,
  successUrl: \`\${process.env.NEXT_PUBLIC_URL}/dashboard?success=true\`,
  cancelUrl: \`\${process.env.NEXT_PUBLIC_URL}/pricing\`,
});

redirect(session.url);
\`\`\`

### Open customer portal
\`\`\`js
import { createPortalSession } from '@/lib/stripe';

const session = await createPortalSession(
  customerId,
  \`\${process.env.NEXT_PUBLIC_URL}/dashboard\`
);
redirect(session.url);
\`\`\`

### Client-side Stripe.js
\`\`\`js
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
\`\`\`

## Local Webhook Testing
\`\`\`bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger a test event
stripe trigger checkout.session.completed
\`\`\`

## Production Checklist
- [ ] Switch from test keys (sk_test_) to live keys (sk_live_)
- [ ] Set up a live webhook endpoint in Stripe Dashboard
- [ ] Test all webhook events with Stripe's built-in test mode
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up tax collection if needed (Stripe Tax)

## Resources
- [Stripe Docs](https://stripe.com/docs)
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Payments](https://stripe.com/docs/testing)
`;
}
