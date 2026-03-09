import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'DynamoDB',
  description: 'Set up AWS DynamoDB with single-table design helpers and local Docker emulator',
  category: 'Database — NoSQL',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const dockerCompose = `version: '3.8'

services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    restart: unless-stopped
    ports:
      - '8000:8000'
    volumes:
      - dynamodb_data:/home/dynamodblocal
    command: '-jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal'

volumes:
  dynamodb_data:
`;

    const dynamoClient = hasTypescript
      ? `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.DYNAMODB_ENDPOINT != null;

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(isLocal && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
  ...(!isLocal && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

export const dynamo = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.DYNAMODB_TABLE ?? 'my-app-table';

// ─── Single-table helpers ──────────────────────────────────

export async function getItem(pk: string, sk: string): Promise<Record<string, unknown> | null> {
  const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return result.Item ?? null;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function updateItem(
  pk: string,
  sk: string,
  updates: Record<string, unknown>
): Promise<void> {
  const keys = Object.keys(updates);
  const UpdateExpression = 'SET ' + keys.map((k) => \`#\${k} = :\${k}\`).join(', ');
  const ExpressionAttributeNames = Object.fromEntries(keys.map((k) => [\`#\${k}\`, k]));
  const ExpressionAttributeValues = Object.fromEntries(keys.map((k) => [\`:\${k}\`, updates[k]]));

  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: pk, SK: sk },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    })
  );
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
}

export async function queryByPK(
  pk: string,
  options: { skPrefix?: string; limit?: number; ascending?: boolean } = {}
): Promise<Record<string, unknown>[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: options.skPrefix
        ? 'PK = :pk AND begins_with(SK, :skPrefix)'
        : 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': pk,
        ...(options.skPrefix && { ':skPrefix': options.skPrefix }),
      },
      Limit: options.limit,
      ScanIndexForward: options.ascending ?? true,
    })
  );
  return (result.Items ?? []) as Record<string, unknown>[];
}
`
      : `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.DYNAMODB_ENDPOINT != null;

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(isLocal && { endpoint: process.env.DYNAMODB_ENDPOINT, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }),
  ...(!isLocal && { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }),
});

export const dynamo = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });
const TABLE = process.env.DYNAMODB_TABLE ?? 'my-app-table';

export async function getItem(pk, sk) {
  const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return result.Item ?? null;
}

export async function putItem(item) {
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function updateItem(pk, sk, updates) {
  const keys = Object.keys(updates);
  const UpdateExpression = 'SET ' + keys.map((k) => \`#\${k} = :\${k}\`).join(', ');
  await dynamo.send(new UpdateCommand({
    TableName: TABLE, Key: { PK: pk, SK: sk }, UpdateExpression,
    ExpressionAttributeNames: Object.fromEntries(keys.map((k) => [\`#\${k}\`, k])),
    ExpressionAttributeValues: Object.fromEntries(keys.map((k) => [\`:\${k}\`, updates[k]])),
  }));
}

export async function deleteItem(pk, sk) {
  await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
}

export async function queryByPK(pk, options = {}) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: options.skPrefix ? 'PK = :pk AND begins_with(SK, :skPrefix)' : 'PK = :pk',
    ExpressionAttributeValues: { ':pk': pk, ...(options.skPrefix && { ':skPrefix': options.skPrefix }) },
    Limit: options.limit,
    ScanIndexForward: options.ascending ?? true,
  }));
  return result.Items ?? [];
}
`;

    return [
      installStep(packageManager, ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb']),
      {
        type: 'write',
        label: 'Write docker-compose.dynamodb.yml',
        filePath: 'docker-compose.dynamodb.yml',
        content: dockerCompose,
      },
      {
        type: 'write',
        label: `Write lib/dynamo.${ext}`,
        filePath: `lib/dynamo.${ext}`,
        content: dynamoClient,
      },
      {
        type: 'env',
        label: 'Add DynamoDB env vars to .env.example',
        vars: {
          AWS_ACCESS_KEY_ID: 'your-access-key-id',
          AWS_SECRET_ACCESS_KEY: 'your-secret-access-key',
          AWS_REGION: 'us-east-1',
          DYNAMODB_TABLE: 'my-app-table',
          DYNAMODB_ENDPOINT: 'http://localhost:8000',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/dynamodb.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Start local DynamoDB: `docker compose -f docker-compose.dynamodb.yml up -d`',
      'Create your table in AWS Console or via CLI (or use NoSQL Workbench)',
      'Remove DYNAMODB_ENDPOINT from .env to connect to real AWS DynamoDB',
      'Use single-table design: PK = entity type + ID, SK = relationship or data type',
    ];
  },
};

function docContent(date) {
  return `# DynamoDB Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`@aws-sdk/client-dynamodb\`, \`@aws-sdk/lib-dynamodb\` |
| \`docker-compose.dynamodb.yml\` | DynamoDB Local container |
| \`lib/dynamo.js\` | Document client, getItem, putItem, updateItem, deleteItem, queryByPK |

## Single-table design pattern
\`\`\`js
// PK = entity type + id, SK = qualifier
await putItem({ PK: 'USER#123', SK: 'PROFILE', email: 'alice@example.com', name: 'Alice' });
await putItem({ PK: 'USER#123', SK: 'POST#456', title: 'Hello World', createdAt: Date.now() });

// Get user profile
const profile = await getItem('USER#123', 'PROFILE');

// Get all posts by user
const posts = await queryByPK('USER#123', { skPrefix: 'POST#' });
\`\`\`

## Resources
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb)
- [Single-table design](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb)
`;
}
