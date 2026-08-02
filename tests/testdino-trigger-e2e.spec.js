// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Deterministic fixtures for verifying TestDino execution triggers.
 *
 * Two of each outcome so a scoped rerun has to pick the right subset rather
 * than accidentally matching everything. No network calls: the trigger feature
 * is what's under test, not the demo site.
 */

test.describe('TestDino trigger E2E', () => {
  test('TD-E2E passes alpha @chromium', async () => {
    expect(1 + 1).toBe(2);
  });

  test('TD-E2E passes beta @chromium', async () => {
    expect('testdino').toContain('dino');
  });

  test('TD-E2E fails gamma @chromium', async () => {
    expect(0, 'intentional failure for TestDino rerun-failed testing').toBe(1);
  });

  test('TD-E2E fails delta @chromium', async () => {
    expect('red', 'intentional failure for TestDino rerun-failed testing').toBe('green');
  });

  // Flaky: fails the first attempt, passes on retry. Needs retries >= 1.
  test('TD-E2E flaky epsilon @chromium', async () => {
    if (test.info().retry === 0) {
      throw new Error('intentional first-attempt flake for TestDino rerun-flaky testing');
    }
    expect(true).toBe(true);
  });

  test('TD-E2E flaky zeta @chromium', async () => {
    if (test.info().retry === 0) {
      throw new Error('intentional first-attempt flake for TestDino rerun-flaky testing');
    }
    expect(true).toBe(true);
  });
});
