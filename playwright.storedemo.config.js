// @ts-check
// Standalone config for the storedemo.testdino.com run-mode suites in
// tests/storedemo. Each run mode is a project; worker count and shard come
// from the npm scripts (see package.json) because Playwright has no
// per-project workers setting.
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// TestDino credentials for these suites live in .env.testdino (gitignored),
// separate from .env, which holds the staging token used by other workflows.
dotenv.config({ path: '.env.testdino', quiet: true });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/storedemo',
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  // Journeys target 65–110s; leave headroom for a slow demo API.
  timeout: 3 * 60 * 1000,
  expect: { timeout: 15 * 1000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'storedemo-report', open: 'never' }],
    ['blob', { outputDir: 'storedemo-blob-report' }],
    // Shards that share TESTDINO_CI_RUN_ID are merged into one TestDino run.
    ...(process.env.TESTDINO_TOKEN
      ? [['@testdino/playwright', {
          token: process.env.TESTDINO_TOKEN,
          ciRunId: process.env.TESTDINO_CI_RUN_ID || undefined,
        }]]
      : []),
  ],

  use: {
    baseURL: 'https://storedemo.testdino.com',
    ...devices['Desktop Chrome'],
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20 * 1000,
    navigationTimeout: 45 * 1000,
  },

  projects: [
    { name: 'sequential', testMatch: 'sequential.spec.js' },
    { name: 'sharded', testMatch: 'sharded.spec.js' },
  ],
});
