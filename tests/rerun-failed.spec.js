// @ts-check
import { expect, test } from '@playwright/test';

// Five fast, deterministic tests for exercising TestDino's "Re-run failed
// tests": three pass and two always fail, so a re-run should execute only
// the two failures.
test.describe('TestDino rerun-failed demo', () => {
  test('rerun demo passes one @chromium', async () => {
    expect(1 + 1).toBe(2);
  });

  test('rerun demo passes two @chromium', async () => {
    expect('testdino').toContain('dino');
  });

  test('rerun demo passes three @chromium', async () => {
    expect([1, 2, 3]).toHaveLength(3);
  });

  test('rerun demo fails four @chromium', async () => {
    expect(0, 'intentional failure for TestDino rerun-failed testing').toBe(1);
  });

  test('rerun demo fails five @chromium', async () => {
    expect('red', 'intentional failure for TestDino rerun-failed testing').toBe('green');
  });
});
