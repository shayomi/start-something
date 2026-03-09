import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { detectContext } from './utils.js';

// Lazy-import inquirer to avoid issues in non-TTY environments
async function confirm(message) {
  const { default: inquirer } = await import('inquirer');
  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message,
      default: true,
    },
  ]);
  return proceed;
}

// Alias map — maps alternate names to canonical skill IDs
const ALIASES = {
  // Postgres
  postgresql: 'postgres',
  pg: 'postgres',
  // MySQL
  mysql2: 'mysql',
  mariadb: 'mysql',
  // SQLite
  sqlite3: 'sqlite',
  // MongoDB
  mongo: 'mongodb',
  // Redis
  redis: 'upstash-redis',
  upstash: 'upstash-redis',
  // Local Redis
  'redis-docker': 'redis-local',
  ioredis: 'redis-local',
  // Firebase
  firebase: 'firebase-firestore',
  firestore: 'firebase-firestore',
  // PlanetScale
  planetscale: 'planetscale',
  ps: 'planetscale',
  // CockroachDB
  cockroach: 'cockroachdb',
  crdb: 'cockroachdb',
  // Railway
  railway: 'railway-postgres',
  // Turso
  libsql: 'turso',
  // PocketBase
  pb: 'pocketbase',
  // Appwrite
  aw: 'appwrite',
  // ORM
  orm: 'prisma',
  // Stripe
  payments: 'stripe',
  // LemonSqueezy
  lemon: 'lemonsqueezy',
  ls: 'lemonsqueezy',
  // Email
  email: 'resend',
  // Sentry
  errors: 'sentry',
  monitoring: 'sentry',
  // PostHog
  analytics: 'posthog',
  ph: 'posthog',
  // BullMQ
  queue: 'bullmq',
  queues: 'bullmq',
  bull: 'bullmq',
  // Inngest
  jobs: 'inngest',
  // Trigger.dev
  'trigger.dev': 'trigger-dev',
  trigger: 'trigger-dev',
  // OpenAI
  gpt: 'openai',
  ai: 'openai',
  // Pinecone
  vectors: 'pinecone',
  vectordb: 'pinecone',
  // Env validate
  'env-validation': 'env-validate',
  'zod-env': 'env-validate',
  // Testing
  test: 'vitest',
  tests: 'vitest',
  e2e: 'playwright',
  // Docker
  docker: 'dockerize',
  // GitHub Actions
  ci: 'github-actions',
  'github-ci': 'github-actions',
  gh: 'github-actions',
  // Search
  search: 'meilisearch',
  meili: 'meilisearch',
  // S3
  s3: 's3-storage',
  aws: 's3-storage',
  // Cloudflare R2
  r2: 'cloudflare-r2',
  cf: 'cloudflare-r2',
  // MinIO
  'object-storage': 'minio',
  // DynamoDB
  dynamo: 'dynamodb',
  // Qdrant
  'vector-search': 'qdrant',
  // TimescaleDB
  timeseries: 'timescaledb',
  tsdb: 'timescaledb',
};

// Skill registry — loaded lazily to keep startup fast
async function loadSkills() {
  const [
    // Original skills
    supabase, neon, strapi, shadcn, clerk, oauth,
    // Database — SQL (local / general)
    postgres, mysql, sqlite,
    // Database — NoSQL / KV
    mongodb, upstashRedis, firebaseFirestore,
    // Database — SQL (managed cloud)
    planetscale, cockroachdb, turso, railwayPostgres,
    // Database — Backend stacks
    appwrite, pocketbase,
    // ORM / Database Tools
    prisma, drizzle,
    // Database — NoSQL (local)
    redisLocal, dynamodb,
    // Database — SQL (local, time-series)
    timescaledb,
    // Database — SQL (managed cloud, additional)
    xata,
    // AI / ML
    openai, pinecone, qdrant,
    // Payments
    stripe, lemonsqueezy,
    // Email
    resend, postmark,
    // Observability
    sentry,
    // Analytics
    posthog, plausible,
    // Background Jobs
    bullmq, inngest, triggerDev,
    // Developer Tools
    envValidate,
    // Testing
    vitest, playwright,
    // DevOps / Infra
    dockerize, githubActions,
    // Search
    meilisearch, typesense,
    // Storage
    s3Storage, cloudflareR2, minio,
  ] = await Promise.all([
    import('./supabase.js'),
    import('./neon.js'),
    import('./strapi.js'),
    import('./shadcn.js'),
    import('./clerk.js'),
    import('./oauth.js'),
    import('./postgres.js'),
    import('./mysql.js'),
    import('./sqlite.js'),
    import('./mongodb.js'),
    import('./upstash-redis.js'),
    import('./firebase-firestore.js'),
    import('./planetscale.js'),
    import('./cockroachdb.js'),
    import('./turso.js'),
    import('./railway-postgres.js'),
    import('./appwrite.js'),
    import('./pocketbase.js'),
    // Phase 3
    import('./prisma.js'),
    import('./drizzle.js'),
    import('./redis-local.js'),
    import('./dynamodb.js'),
    import('./timescaledb.js'),
    import('./xata.js'),
    import('./openai.js'),
    import('./pinecone.js'),
    import('./qdrant.js'),
    import('./stripe.js'),
    import('./lemonsqueezy.js'),
    import('./resend.js'),
    import('./postmark.js'),
    import('./sentry.js'),
    import('./posthog.js'),
    import('./plausible.js'),
    import('./bullmq.js'),
    import('./inngest.js'),
    import('./trigger-dev.js'),
    import('./env-validate.js'),
    import('./vitest.js'),
    import('./playwright.js'),
    import('./dockerize.js'),
    import('./github-actions.js'),
    import('./meilisearch.js'),
    import('./typesense.js'),
    import('./s3-storage.js'),
    import('./cloudflare-r2.js'),
    import('./minio.js'),
  ]);

  return {
    // Original skills
    supabase: supabase.default,
    neon: neon.default,
    strapi: strapi.default,
    shadcn: shadcn.default,
    clerk: clerk.default,
    oauth: oauth.default,
    // Database — SQL (managed cloud)
    planetscale: planetscale.default,
    cockroachdb: cockroachdb.default,
    turso: turso.default,
    'railway-postgres': railwayPostgres.default,
    xata: xata.default,
    // Database — SQL (local / general)
    postgres: postgres.default,
    mysql: mysql.default,
    sqlite: sqlite.default,
    timescaledb: timescaledb.default,
    // Database — NoSQL / KV
    mongodb: mongodb.default,
    'upstash-redis': upstashRedis.default,
    'firebase-firestore': firebaseFirestore.default,
    'redis-local': redisLocal.default,
    dynamodb: dynamodb.default,
    // Database — Backend stacks
    appwrite: appwrite.default,
    pocketbase: pocketbase.default,
    // ORM / Database Tools
    prisma: prisma.default,
    drizzle: drizzle.default,
    // AI / ML
    openai: openai.default,
    pinecone: pinecone.default,
    qdrant: qdrant.default,
    // Payments
    stripe: stripe.default,
    lemonsqueezy: lemonsqueezy.default,
    // Email
    resend: resend.default,
    postmark: postmark.default,
    // Observability
    sentry: sentry.default,
    // Analytics
    posthog: posthog.default,
    plausible: plausible.default,
    // Background Jobs
    bullmq: bullmq.default,
    inngest: inngest.default,
    'trigger-dev': triggerDev.default,
    // Developer Tools
    'env-validate': envValidate.default,
    // Testing
    vitest: vitest.default,
    playwright: playwright.default,
    // DevOps / Infra
    dockerize: dockerize.default,
    'github-actions': githubActions.default,
    // Search
    meilisearch: meilisearch.default,
    typesense: typesense.default,
    // Storage
    's3-storage': s3Storage.default,
    'cloudflare-r2': cloudflareR2.default,
    minio: minio.default,
  };
}

export async function listSkills() {
  const registry = await loadSkills();
  return Object.entries(registry).map(([id, skill]) => ({
    id,
    name: skill.name,
    description: skill.description,
    supportedFrameworks: skill.supportedFrameworks,
    category: skill.category || 'Other',
  }));
}

export async function runSkill(skillName, options = {}) {
  const registry = await loadSkills();

  // Resolve aliases
  const canonical = ALIASES[skillName.toLowerCase()] || skillName.toLowerCase();
  const skill = registry[canonical];

  if (!skill) {
    console.log(chalk.red(`\n  Unknown skill: ${chalk.bold(skillName)}\n`));
    console.log(chalk.bold('  Available skills:\n'));
    const skills = await listSkills();
    // Group by category
    const byCategory = {};
    skills.forEach(({ id, name, description, category }) => {
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push({ id, name, description });
    });
    Object.entries(byCategory).forEach(([cat, items]) => {
      console.log(chalk.bold.cyan(`  ${cat}`));
      items.forEach(({ id, description }) => {
        console.log(`    ${chalk.cyan('●')} ${chalk.bold(id.padEnd(20))} ${chalk.gray(description)}`);
      });
      console.log('');
    });
    process.exit(1);
  }

  // Resolve project directory
  const projectDir = options.dir
    ? path.resolve(options.dir)
    : process.cwd();

  const pkgPath = path.join(projectDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    console.log(
      chalk.red(`\n  No package.json found in ${chalk.bold(projectDir)}\n`) +
      chalk.gray('  Run this command inside an existing Node.js project.\n')
    );
    process.exit(1);
  }

  // Detect context (now includes packageManager)
  const context = await detectContext(projectDir);

  // Framework compatibility check
  if (
    skill.supportedFrameworks.length > 0 &&
    !skill.supportedFrameworks.includes(context.framework)
  ) {
    console.log(
      chalk.yellow(
        `\n  Warning: ${chalk.bold(skill.name)} is designed for ${skill.supportedFrameworks.join(', ')} ` +
        `but this project appears to be ${chalk.bold(context.framework || 'unknown')}.`
      )
    );
    const shouldContinue = await confirm('Continue anyway?');
    if (!shouldContinue) {
      process.exit(0);
    }
  }

  // Get steps
  const steps = skill.steps(context);

  // Show plan
  console.log(chalk.bold.magenta(`\n  ${skill.name} — Setup Plan\n`));
  if (skill.description) {
    console.log(chalk.gray(`  ${skill.description}\n`));
  }
  steps.forEach((step, i) => {
    const label = step.label || step.command || step.filePath || step.type;
    console.log(`  ${chalk.gray(`${i + 1}.`)} ${label}`);
  });
  console.log('');

  // Confirm
  const proceed = await confirm(`Run ${steps.length} steps for ${skill.name}?`);
  if (!proceed) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    process.exit(0);
  }

  console.log('');

  // Execute steps
  for (const step of steps) {
    await runStep(step, context, canonical);
  }

  // Print next steps
  const nextStepsList = skill.nextSteps(context);
  if (nextStepsList.length > 0) {
    console.log(chalk.bold.green('\n  Next steps:\n'));
    nextStepsList.forEach((s, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${s}`);
    });
  }

  console.log(
    chalk.gray(`\n  Docs written to ${chalk.white(`docs/${canonical}.md`)}\n`)
  );
}

async function runStep(step, context, skillId) {
  const { projectDir, envExamplePath } = context;
  const label = step.label || step.command || step.filePath || step.type;
  const spinner = ora(label).start();

  try {
    switch (step.type) {
      case 'exec': {
        execSync(step.command, {
          cwd: step.cwd || projectDir,
          stdio: 'pipe',
        });
        break;
      }

      case 'write': {
        const fullPath = path.join(projectDir, step.filePath);
        await fs.outputFile(fullPath, step.content);
        break;
      }

      case 'env': {
        await mergeEnvExample(envExamplePath, step.vars);
        break;
      }

      case 'doc': {
        const docDir = path.join(projectDir, 'docs');
        const docFile = path.join(docDir, `${skillId}.md`);
        await fs.outputFile(docFile, step.content);
        break;
      }

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    spinner.succeed(chalk.gray(label));
  } catch (err) {
    spinner.warn(chalk.yellow(`${label} — ${err.message}`));
  }
}

export async function mergeEnvExample(envExamplePath, vars) {
  let existing = '';
  try {
    existing = await fs.readFile(envExamplePath, 'utf8');
  } catch {
    // File doesn't exist yet — start fresh
  }

  const existingKeys = new Set(
    existing
      .split('\n')
      .filter(line => line.includes('='))
      .map(line => line.split('=')[0].trim())
  );

  const newLines = Object.entries(vars)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => `${key}=${value}`);

  if (newLines.length === 0) return;

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  const appended = separator + newLines.join('\n') + '\n';
  await fs.appendFile(envExamplePath, appended);
}
