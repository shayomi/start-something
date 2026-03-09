const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'GitHub Actions',
  description: 'Set up CI/CD workflows: lint, test, build, and deploy pipelines for your project',
  category: 'DevOps / Infra',
  supportedFrameworks: [],

  steps(context) {
    const { framework } = context;
    const isNext = framework === 'nextjs';

    const ciWorkflow = `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint --if-present

      - name: Run type check
        run: npm run typecheck --if-present

      - name: Run tests
        run: npm test --if-present
        env:
          NODE_ENV: test

      - name: Upload coverage
        if: success()
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
        env:
          NODE_ENV: production
`;

    const deployWorkflow = `name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build --if-present
        env:
          NODE_ENV: production

${isNext
  ? `      # ─── Vercel deploy ────────────────────────────────────
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'`
  : `      # ─── Railway deploy ────────────────────────────────────
      # - name: Deploy to Railway
      #   uses: bervProject/railway-deploy@main
      #   with:
      #     railway_token: \${{ secrets.RAILWAY_TOKEN }}
      #     service: my-service

      # ─── Docker deploy ─────────────────────────────────────
      # - name: Build and push Docker image
      #   uses: docker/build-push-action@v5
      #   with:
      #     push: true
      #     tags: ghcr.io/\${{ github.repository }}:latest`}
`;

    const prWorkflow = `name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  size-check:
    name: Bundle Size Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
        env:
          NODE_ENV: production

  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high

  label-pr:
    name: Auto-label PR
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: \${{ secrets.GITHUB_TOKEN }}
`;

    const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
`;

    return [
      {
        type: 'write',
        label: 'Write .github/workflows/ci.yml',
        filePath: '.github/workflows/ci.yml',
        content: ciWorkflow,
      },
      {
        type: 'write',
        label: 'Write .github/workflows/deploy.yml',
        filePath: '.github/workflows/deploy.yml',
        content: deployWorkflow,
      },
      {
        type: 'write',
        label: 'Write .github/workflows/pr.yml',
        filePath: '.github/workflows/pr.yml',
        content: prWorkflow,
      },
      {
        type: 'write',
        label: 'Write .github/dependabot.yml',
        filePath: '.github/dependabot.yml',
        content: dependabotConfig,
      },
      {
        type: 'doc',
        label: 'Write docs/github-actions.md',
        content: docContent(DATE, isNext),
      },
    ];
  },

  nextSteps() {
    return [
      'Push to GitHub — workflows will trigger automatically on push/PR',
      'Add secrets in GitHub repo → Settings → Secrets and Variables → Actions',
      '  - For Vercel deploy: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID',
      '  - For coverage: CODECOV_TOKEN (optional)',
      'Add "test" and "lint" scripts to your package.json if not present',
      'Review .github/workflows/deploy.yml and uncomment your deploy provider',
    ];
  },
};

function docContent(date, isNext) {
  return `# GitHub Actions Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| \`.github/workflows/ci.yml\` | Lint, typecheck, test, build on push/PR |
| \`.github/workflows/deploy.yml\` | Deploy to production on main push |
| \`.github/workflows/pr.yml\` | PR size check, dependency review, auto-label |
| \`.github/dependabot.yml\` | Weekly npm + GitHub Actions updates |

## Required Secrets
Set these in GitHub → Settings → Secrets:

${isNext
  ? `| Secret | Description |
|--------|-------------|
| \`VERCEL_TOKEN\` | Vercel personal access token |
| \`VERCEL_ORG_ID\` | Vercel org/team ID |
| \`VERCEL_PROJECT_ID\` | Vercel project ID |`
  : `| Secret | Description |
|--------|-------------|
| \`RAILWAY_TOKEN\` | Railway API token (if using Railway) |`}
| \`CODECOV_TOKEN\` | Codecov upload token (optional) |

## Adding package.json scripts
\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext .js,.ts,.jsx,.tsx",
    "typecheck": "tsc --noEmit",
    "build": "next build"
  }
}
\`\`\`

## Resources
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel GitHub Action](https://github.com/amondnet/vercel-action)
- [Dependabot Docs](https://docs.github.com/en/code-security/dependabot)
`;
}
