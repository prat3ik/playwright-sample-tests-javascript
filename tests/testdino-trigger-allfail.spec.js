// @ts-check
import { expect, test } from '@playwright/test';

/**
 * All-failures fixture: every test fails deterministically on every attempt.
 * Gives the dashboard a fully red run (0 passed, 0 flaky).
 */

test.describe('TestDino all-fail E2E', () => {
  test('TD-ALLFAIL checkout total @chromium', async () => {
    expect(99, 'intentional failure: wrong checkout total').toBe(100);
  });

  test('TD-ALLFAIL login redirect @chromium', async () => {
    expect('/home', 'intentional failure: wrong redirect target').toBe('/dashboard');
  });

  test('TD-ALLFAIL cart badge @chromium', async () => {
    expect(0, 'intentional failure: cart badge count').toBe(3);
  });

  test('TD-ALLFAIL search results @chromium', async () => {
    expect([], 'intentional failure: empty search results').toHaveLength(5);
  });
});
