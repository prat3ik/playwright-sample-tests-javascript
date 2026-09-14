// @ts-check
// Playwright config for the storedemo.testdino.com journeys. It lives in its own
// directory under the default file name because `tdpw orchestrate discover`
// always lists tests with the default config, so every command here runs with
// storedemo/ as the working directory (see the storedemo:* npm scripts).
//
// One project, one spec file per journey. The sequential, sharded and
// orchestrated pipelines differ only in --workers, --shard or orchestration.
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Local TestDino credentials live in the repo-root .env.testdino (gitignored),
// separate from .env, which holds the staging token used by other workflows.
// Values already in the environment win, so CI settings are never overridden.
dotenv.config({ path: path.join(__dirname, '..', '.env.testdino'), quiet: true });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './journeys',
  outputDir: './test-results',
  forbidOnly: isCI,
  retries: 0,
  // Orchestration reads the per-machine worker count from here.
  workers: 2,
  // The longest duration tier targets up to 235s; leave headroom for a slow demo API.
  timeout: 6 * 60 * 1000,
  expect: { timeout: 15 * 1000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: './report', open: 'never' }],
    ['blob', { outputDir: './blob-report' }],
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

  projects: [{ name: 'storedemo' }],
});
