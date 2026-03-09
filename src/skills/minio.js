import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'MinIO',
  description: 'Set up self-hosted MinIO S3-compatible object storage via Docker',
  category: 'Storage',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    ports:
      - '9000:9000'   # S3 API
      - '9001:9001'   # Web Console
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
`;

    const minioClient = hasTypescript
      ? `import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// MinIO uses the S3-compatible API
export const minio = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
  region: 'us-east-1', // MinIO requires a region, any value works
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = process.env.MINIO_BUCKET ?? 'uploads';

// ─── Bucket setup ─────────────────────────────────────────

export async function ensureBucket(): Promise<void> {
  try {
    await minio.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await minio.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(\`Created MinIO bucket: \${BUCKET}\`);
  }
}

// ─── Upload ───────────────────────────────────────────────

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<string> {
  await minio.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return \`\${process.env.MINIO_ENDPOINT ?? 'http://localhost:9000'}/\${BUCKET}/\${key}\`;
}

// ─── Presigned URLs ───────────────────────────────────────

export async function getUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(minio, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn });
}

export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(minio, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  await minio.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
`
      : `import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const minio = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.MINIO_BUCKET ?? 'uploads';

export async function ensureBucket() {
  try { await minio.send(new HeadBucketCommand({ Bucket: BUCKET })); }
  catch { await minio.send(new CreateBucketCommand({ Bucket: BUCKET })); }
}

export async function uploadFile(key, body, contentType) {
  await minio.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return \`\${process.env.MINIO_ENDPOINT ?? 'http://localhost:9000'}/\${BUCKET}/\${key}\`;
}

export async function getUploadUrl(key, contentType, expiresIn = 300) {
  return getSignedUrl(minio, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn });
}

export async function getDownloadUrl(key, expiresIn = 3600) {
  return getSignedUrl(minio, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

export async function deleteFile(key) {
  await minio.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
`;

    return [
      installStep(packageManager, ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']),
      {
        type: 'write',
        label: 'Write docker-compose.minio.yml',
        filePath: 'docker-compose.minio.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/minio.${ext}`,
        filePath: `lib/minio.${ext}`,
        content: minioClient,
      },
      {
        type: 'env',
        label: 'Add MinIO env vars to .env.example',
        vars: {
          MINIO_ENDPOINT: 'http://localhost:9000',
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_BUCKET: 'uploads',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/minio.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start MinIO: `docker compose -f docker-compose.minio.yml up -d`',
      'Open MinIO Console: http://localhost:9001 (login: minioadmin/minioadmin)',
      'Call ensureBucket() once at startup to create your bucket',
      'Use uploadFile() or getUploadUrl() for file uploads',
      'For production, set strong MINIO_ROOT_USER and MINIO_ROOT_PASSWORD',
    ];
  },
};

function docContent(date) {
  return `# MinIO Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`@aws-sdk/client-s3\`, \`@aws-sdk/s3-request-presigner\` |
| \`docker-compose.minio.yml\` | MinIO container with web console |
| \`lib/minio.js\` | S3-compatible client, upload, presigned URLs |

## Usage
\`\`\`js
import { ensureBucket, uploadFile, getUploadUrl } from '@/lib/minio';

await ensureBucket(); // call once at startup

const url = await uploadFile('images/photo.jpg', fileBuffer, 'image/jpeg');
const uploadUrl = await getUploadUrl('images/photo.jpg', 'image/jpeg');
\`\`\`

## Resources
- [MinIO Docs](https://min.io/docs)
- [MinIO Console](http://localhost:9001)
`;
}
