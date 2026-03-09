import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'AWS S3 Storage',
  description: 'Set up AWS S3 file uploads with presigned URLs, public access, and stream helpers',
  category: 'Storage',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const s3Client = hasTypescript
      ? `import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

// ─── Upload ───────────────────────────────────────────────

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  options: { contentType?: string; isPublic?: boolean; metadata?: Record<string, string> } = {}
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      ACL: options.isPublic ? 'public-read' : 'private',
      Metadata: options.metadata,
    })
  );
  return \`https://\${BUCKET}.s3.\${process.env.AWS_REGION}.amazonaws.com/\${key}\`;
}

// ─── Presigned URLs ───────────────────────────────────────

export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ─── Helpers ──────────────────────────────────────────────

export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function generateKey(prefix: string, filename: string): string {
  const ext = filename.split('.').pop();
  const id = crypto.randomUUID();
  return \`\${prefix}/\${id}.\${ext}\`;
}
`
      : `import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

export async function uploadFile(key, body, options = {}) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body,
    ContentType: options.contentType,
    ACL: options.isPublic ? 'public-read' : 'private',
    Metadata: options.metadata,
  }));
  return \`https://\${BUCKET}.s3.\${process.env.AWS_REGION}.amazonaws.com/\${key}\`;
}

export async function getUploadUrl(key, contentType, expiresIn = 300) {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn });
}

export async function getDownloadUrl(key, expiresIn = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

export async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function fileExists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; }
  catch { return false; }
}

export function generateKey(prefix, filename) {
  const ext = filename.split('.').pop();
  const id = crypto.randomUUID();
  return \`\${prefix}/\${id}.\${ext}\`;
}
`;

    return [
      installStep(packageManager, ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']),
      {
        type: 'write',
        label: `Write lib/s3.${ext}`,
        filePath: `lib/s3.${ext}`,
        content: s3Client,
      },
      {
        type: 'env',
        label: 'Add AWS S3 env vars to .env.example',
        vars: {
          AWS_ACCESS_KEY_ID: 'your-access-key-id',
          AWS_SECRET_ACCESS_KEY: 'your-secret-access-key',
          AWS_REGION: 'us-east-1',
          AWS_S3_BUCKET: 'your-bucket-name',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/s3-storage.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create an S3 bucket in AWS Console or via CLI: `aws s3 mb s3://your-bucket-name`',
      'Create an IAM user with S3 permissions and copy keys into .env',
      'Configure CORS on your bucket for browser uploads',
      'Use getUploadUrl() for client-side direct-to-S3 uploads (safer than server-side)',
      'Use getDownloadUrl() for time-limited download links to private files',
    ];
  },
};

function docContent(date) {
  return `# AWS S3 Storage Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`@aws-sdk/client-s3\`, \`@aws-sdk/s3-request-presigner\` |
| \`lib/s3.js\` | Upload, presigned URLs, delete, exists helpers |

## Usage

### Server-side upload
\`\`\`js
import { uploadFile, generateKey } from '@/lib/s3';

const key = generateKey('avatars', file.name);
const url = await uploadFile(key, fileBuffer, { contentType: 'image/jpeg', isPublic: true });
\`\`\`

### Client-side direct upload (presigned)
\`\`\`js
// Server: generate upload URL
import { getUploadUrl } from '@/lib/s3';
const uploadUrl = await getUploadUrl('uploads/myfile.jpg', 'image/jpeg');

// Client: upload directly to S3
await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
\`\`\`

### Download URL for private files
\`\`\`js
import { getDownloadUrl } from '@/lib/s3';
const url = await getDownloadUrl('private/document.pdf', 3600); // 1 hour
\`\`\`

## Resources
- [AWS S3 Docs](https://docs.aws.amazon.com/s3)
- [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
`;
}
