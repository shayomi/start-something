import { installDevStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Playwright',
  description: 'Set up Playwright E2E testing with cross-browser support, fixtures, and CI config',
  category: 'Testing',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const playwrightConfig = hasTypescript
      ? `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  // Spin up dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
`
      : `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
`;

    const exampleTest = hasTypescript
      ? `import { test, expect, Page } from '@playwright/test';

// ─── Home page tests ──────────────────────────────────────

test.describe('Home page', () => {
  test('loads and displays title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/my app/i);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a[href="/about"]');
    await expect(page).toHaveURL('/about');
  });
});

// ─── Auth flow tests ──────────────────────────────────────

test.describe('Authentication', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
  });
});

// ─── Accessibility ────────────────────────────────────────

test('home page has no obvious a11y issues', async ({ page }) => {
  await page.goto('/');
  // Check for common a11y issues
  const images = page.locator('img:not([alt])');
  await expect(images).toHaveCount(0); // all images should have alt text
});
`
      : `import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and displays title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/my app/i);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a[href="/about"]');
    await expect(page).toHaveURL('/about');
  });
});

test.describe('Authentication', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
  });
});
`;

    const fixturesFile = hasTypescript
      ? `import { test as base, expect } from '@playwright/test';

// ─── Custom fixtures ──────────────────────────────────────

type AppFixtures = {
  loggedInPage: import('@playwright/test').Page;
};

export const test = base.extend<AppFixtures>({
  loggedInPage: async ({ page }, use) => {
    // Log in before each test that uses this fixture
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { expect };
`
      : `import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { expect };
`;

    const ciWorkflow = `name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
`;

    return [
      installDevStep(packageManager, ['@playwright/test'], 'Install @playwright/test (dev)'),
      {
        type: 'exec',
        label: 'Install Playwright browsers',
        command: 'npx playwright install --with-deps chromium',
        cwd: context.projectDir,
      },
      {
        type: 'write',
        label: `Write playwright.config.${ext}`,
        filePath: `playwright.config.${ext}`,
        content: playwrightConfig,
      },
      {
        type: 'write',
        label: `Write e2e/home.spec.${ext}`,
        filePath: `e2e/home.spec.${ext}`,
        content: exampleTest,
      },
      {
        type: 'write',
        label: `Write e2e/fixtures.${ext}`,
        filePath: `e2e/fixtures.${ext}`,
        content: fixturesFile,
      },
      {
        type: 'write',
        label: 'Write .github/workflows/e2e.yml',
        filePath: '.github/workflows/e2e.yml',
        content: ciWorkflow,
      },
      {
        type: 'doc',
        label: 'Write docs/playwright.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Run E2E tests: `npx playwright test`',
      'Open Playwright UI: `npx playwright test --ui`',
      'View last report: `npx playwright show-report`',
      'Record a new test: `npx playwright codegen http://localhost:3000`',
      'Update example tests in e2e/ to match your actual pages',
    ];
  },
};

function docContent(date) {
  return `# Playwright Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Dev package | \`@playwright/test\` |
| \`playwright.config.js\` | Config with Chromium, Firefox, Safari, Mobile |
| \`e2e/home.spec.js\` | Example tests for home page and auth |
| \`e2e/fixtures.js\` | Custom loggedInPage fixture |
| \`.github/workflows/e2e.yml\` | CI workflow for E2E tests |

## Commands
\`\`\`bash
npx playwright test              # run all tests
npx playwright test --ui         # visual UI mode
npx playwright test e2e/home     # run specific file
npx playwright test --headed     # run in headed browser
npx playwright codegen           # record tests visually
npx playwright show-report       # view HTML report
\`\`\`

## Using the loggedInPage fixture
\`\`\`js
import { test, expect } from './fixtures';

test('dashboard is visible when logged in', async ({ loggedInPage }) => {
  await expect(loggedInPage.locator('h1')).toContainText('Dashboard');
});
\`\`\`

## Resources
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Codegen](https://playwright.dev/docs/codegen)
`;
}
