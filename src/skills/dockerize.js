import { } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Dockerize',
  description: 'Add production-ready Dockerfile, docker-compose, .dockerignore, and health check endpoint',
  category: 'DevOps / Infra',
  supportedFrameworks: [],

  steps(context) {
    const { framework } = context;
    const isNext = framework === 'nextjs';
    const isExpress = framework === 'express' || framework === 'fastify' || framework === 'koa';

    const dockerfile = isNext
      ? `# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
`
      : `# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
${isNext ? 'RUN npm run build' : '# RUN npm run build  # uncomment if you have a build step'}

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/src ./src
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
`;

    const dockerComposeFull = `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    restart: unless-stopped
    ports:
      - '\${PORT:-3000}:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: \${POSTGRES_DB:-myapp}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U \${POSTGRES_USER:-postgres}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
`;

    const dockerignore = `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnp
.pnp.js

# Build outputs
.next
dist
build
out

# Environment
.env
.env.local
.env.*.local

# Dev tools
.git
.gitignore
.eslintrc*
.prettierrc*
*.md
!README.md

# Tests
coverage
.nyc_output
tests
e2e
__tests__
*.test.*
*.spec.*

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;

    const healthRoute = isNext
      ? `import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '0.0.0',
  });
}
`
      : `// Express/Node health check
// Add to your Express app:
// app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

export function healthHandler(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
`;

    const healthPath = isNext
      ? (context.usesSrcDir ? 'src/app' : 'app') + '/api/health/route.js'
      : 'lib/health.js';

    return [
      {
        type: 'write',
        label: 'Write Dockerfile',
        filePath: 'Dockerfile',
        content: dockerfile,
      },
      {
        type: 'write',
        label: 'Write docker-compose.yml',
        filePath: 'docker-compose.yml',
        content: dockerComposeFull,
      },
      {
        type: 'write',
        label: 'Write .dockerignore',
        filePath: '.dockerignore',
        content: dockerignore,
      },
      {
        type: 'write',
        label: `Write ${healthPath}`,
        filePath: healthPath,
        content: healthRoute,
      },
      {
        type: 'doc',
        label: 'Write docs/dockerize.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Build the image: `docker build -t myapp .`',
      'Start the full stack: `docker compose up -d`',
      'Test health: `curl http://localhost:3000/api/health`',
      'For Next.js: add `output: "standalone"` to next.config.js',
      'Set all env vars in a .env file (docker compose reads it automatically)',
    ];
  },
};

function docContent(date) {
  return `# Dockerize Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| \`Dockerfile\` | Multi-stage production build |
| \`docker-compose.yml\` | Full stack: app + Postgres + Redis |
| \`.dockerignore\` | Excludes unnecessary files from the image |
| \`app/api/health/route.js\` | Health check endpoint |

## Commands
\`\`\`bash
# Build image
docker build -t myapp .

# Run the full stack
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down

# Stop + remove data
docker compose down -v
\`\`\`

## Next.js Note
Add to \`next.config.js\` for standalone output:
\`\`\`js
module.exports = { output: 'standalone' };
\`\`\`

## Resources
- [Docker Docs](https://docs.docker.com)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
`;
}
