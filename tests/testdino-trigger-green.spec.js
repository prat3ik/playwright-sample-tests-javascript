// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Green-run fixture for TestDino "Rerun flaky" on a run whose checks all pass:
 * 2 pass + 2 flaky (fail once, pass on retry), no hard failures. Needs
 * retries >= 1 so the flaky pair ends the run green with outcome 'flaky'.
 */

test.describe('TestDino trigger green E2E', () => {
  test('TD-GREEN passes alpha @chromium', async () => {
    expect(2 + 2).toBe(4);
  });

  test('TD-GREEN passes beta @chromium', async () => {
    expect('rerun').toContain('run');
  });

  test('TD-GREEN flaky gamma @chromium', async () => {
    if (test.info().retry === 0) {
      throw new Error('intentional first-attempt flake for TestDino rerun-flaky-on-green testing');
    }
    expect(true).toBe(true);
  });

  test('TD-GREEN flaky delta @chromium', async () => {
    if (test.info().retry === 0) {
      throw new Error('intentional first-attempt flake for TestDino rerun-flaky-on-green testing');
    }
    expect(true).toBe(true);
  });
});
