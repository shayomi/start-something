import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Resend',
  description: 'Set up Resend transactional email with React Email templates',
  category: 'Email',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const resendClient = hasTypescript
      ? `import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com';

// ─── Email helpers ────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  react,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  text?: string;
  replyTo?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
    text,
    reply_to: replyTo,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: \`Welcome, \${name}!\`,
    text: \`Hi \${name},\\n\\nThanks for joining! We're excited to have you.\\n\\nBest,\\nThe Team\`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: 'Reset your password',
    text: \`Click the link below to reset your password:\\n\\n\${resetUrl}\\n\\nThis link expires in 1 hour.\`,
  });
}
`
      : `import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com';

export async function sendEmail({ to, subject, react, text, replyTo }) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
    text,
    reply_to: replyTo,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: \`Welcome, \${name}!\`,
    text: \`Hi \${name},\\n\\nThanks for joining! We're excited to have you.\\n\\nBest,\\nThe Team\`,
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  return sendEmail({
    to,
    subject: 'Reset your password',
    text: \`Click the link below to reset your password:\\n\\n\${resetUrl}\\n\\nThis link expires in 1 hour.\`,
  });
}
`;

    const welcomeEmailTemplate = hasTypescript
      ? `import * as React from 'react';

interface WelcomeEmailProps {
  name: string;
  loginUrl?: string;
}

export function WelcomeEmail({ name, loginUrl = 'https://yourdomain.com/login' }: WelcomeEmailProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a1a' }}>Welcome, {name}!</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Thanks for joining us. We're excited to have you on board.
      </p>
      <a
        href={loginUrl}
        style={{
          display: 'inline-block',
          background: '#0070f3',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginTop: '16px',
        }}
      >
        Get Started
      </a>
      <p style={{ color: '#999', fontSize: '12px', marginTop: '32px' }}>
        If you did not create an account, please ignore this email.
      </p>
    </div>
  );
}
`
      : `import * as React from 'react';

export function WelcomeEmail({ name, loginUrl = 'https://yourdomain.com/login' }) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a1a' }}>Welcome, {name}!</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Thanks for joining us. We're excited to have you on board.
      </p>
      <a
        href={loginUrl}
        style={{
          display: 'inline-block',
          background: '#0070f3',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginTop: '16px',
        }}
      >
        Get Started
      </a>
      <p style={{ color: '#999', fontSize: '12px', marginTop: '32px' }}>
        If you did not create an account, please ignore this email.
      </p>
    </div>
  );
}
`;

    return [
      installStep(packageManager, ['resend', '@react-email/components']),
      {
        type: 'write',
        label: `Write lib/resend.${ext}`,
        filePath: `lib/resend.${ext}`,
        content: resendClient,
      },
      {
        type: 'write',
        label: `Write emails/welcome.${ext}x`,
        filePath: `emails/welcome.${ext}x`,
        content: welcomeEmailTemplate,
      },
      {
        type: 'env',
        label: 'Add Resend env vars to .env.example',
        vars: {
          RESEND_API_KEY: 're_your-resend-api-key',
          RESEND_FROM_EMAIL: 'noreply@yourdomain.com',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/resend.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create an account at https://resend.com',
      'Get your API key from Resend Dashboard → API Keys',
      'Add and verify your domain in Resend Dashboard → Domains',
      'Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env',
      'Use sendWelcomeEmail() or sendEmail() from lib/resend',
      'Pass React Email templates via the `react` prop for rich HTML emails',
    ];
  },
};

function docContent(date) {
  return `# Resend Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`resend\`, \`@react-email/components\` |
| \`lib/resend.js\` | Resend client + sendEmail, sendWelcomeEmail, sendPasswordResetEmail |
| \`emails/welcome.jsx\` | React Email welcome template |

## Usage

### Send a plain text email
\`\`\`js
import { sendEmail } from '@/lib/resend';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello!',
  text: 'Plain text body',
});
\`\`\`

### Send with a React Email template
\`\`\`js
import { sendEmail } from '@/lib/resend';
import { WelcomeEmail } from '@/emails/welcome';

await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  react: <WelcomeEmail name="Alice" />,
});
\`\`\`

### Preview emails locally
\`\`\`bash
npx react-email dev
# opens http://localhost:3000 with email preview
\`\`\`

## Production Checklist
- [ ] Verify your sending domain in Resend Dashboard
- [ ] Set RESEND_API_KEY in your hosting environment
- [ ] Test all email templates before launch
- [ ] Set up bounce and complaint webhooks

## Resources
- [Resend Docs](https://resend.com/docs)
- [React Email](https://react.email)
`;
}
