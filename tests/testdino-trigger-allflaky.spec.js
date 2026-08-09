// @ts-check
import { expect, test } from '@playwright/test';

/**
 * All-flaky fixture: every test fails its first attempt and passes on retry.
 * With retries >= 1 the run ends green with every case outcome 'flaky'.
 */

function flakeOnce(info) {
  if (info.retry === 0) {
    throw new Error('intentional first-attempt flake');
  }
}

test.describe('TestDino all-flaky E2E', () => {
  test('TD-ALLFLAKY payment gateway @chromium', async () => {
    flakeOnce(test.info());
    expect(true).toBe(true);
  });

  test('TD-ALLFLAKY session refresh @chromium', async () => {
    flakeOnce(test.info());
    expect('token').toContain('token');
  });

  test('TD-ALLFLAKY image upload @chromium', async () => {
    flakeOnce(test.info());
    expect(3).toBeGreaterThan(1);
  });

  test('TD-ALLFLAKY email notification @chromium', async () => {
    flakeOnce(test.info());
    expect(['sent']).toHaveLength(1);
  });
});
