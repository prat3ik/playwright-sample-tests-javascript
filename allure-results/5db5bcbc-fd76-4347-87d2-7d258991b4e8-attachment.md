# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bulk-tc.spec.js >> Flaky suite >> FLAKY-1: intermittent assertion (fails ~30% of runs)
- Location: tests/bulk-tc.spec.js:28:9

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /TestDino/
Received string:  "Deployment Paused"
Timeout: 10000ms

Call log:
  - Expect "toHaveTitle" with timeout 10000ms
    14 × unexpected value "Deployment Paused"

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - main:
      - paragraph [ref=e2]: This deployment is temporarily paused
      - paragraph [ref=e3]:
        - code [ref=e5]: bom1::9bcf8-1784808204219-3e7655346c19
```

# Test source

```ts
  1  | // @ts-check
  2  | // Bulk-generated suite: one loop, TOTAL_TESTS test cases.
  3  | // Each iteration registers an independent test titled TC-<n>, so Playwright
  4  | // sees 5,000 real tests and distributes them evenly across shards/workers.
  5  | // Override the count with TC_COUNT (e.g. TC_COUNT=5000 npx playwright test).
  6  | // Default is 5 for now to keep TestDino streaming runs small.
  7  | import { expect, test } from '@playwright/test';
  8  | 
  9  | const TOTAL_TESTS = Number(process.env.TC_COUNT ?? 5);
  10 | 
  11 | test.describe('Bulk storefront checks', () => {
  12 |   for (let i = 1; i <= TOTAL_TESTS; i++) {
  13 |     test(`TC-${i}: Verify storefront loads and title is correct`, { tag: '@chromium' }, async ({ page }) => {
  14 |       await page.goto('/');
  15 |       await page.waitForLoadState('domcontentloaded');
  16 |       await expect(page).toHaveTitle(/TestDino/);
  17 |     });
  18 |   }
  19 | });
  20 | 
  21 | // Intentionally flaky tests for BuildPulse/TestDino flake detection.
  22 | // Each fails randomly at a different rate, so across runs (and retries)
  23 | // they produce the pass/fail-on-same-commit signal flake detectors look for.
  24 | test.describe('Flaky suite', () => {
  25 |   const FLAKE_RATES = { 1: 0.3, 2: 0.4, 3: 0.5, 4: 0.6, 5: 0.2 };
  26 | 
  27 |   for (const [n, rate] of Object.entries(FLAKE_RATES)) {
  28 |     test(`FLAKY-${n}: intermittent assertion (fails ~${rate * 100}% of runs)`, { tag: '@chromium' }, async ({ page }) => {
  29 |       await page.goto('/');
  30 |       expect(Math.random(), `Simulated flake: random draw fell below ${rate}`).toBeGreaterThan(rate);
> 31 |       await expect(page).toHaveTitle(/TestDino/);
     |                          ^ Error: expect(page).toHaveTitle(expected) failed
  32 |     });
  33 |   }
  34 | 
  35 |   test('FLAKY-6: simulated slow dependency (1-3s) against a 2s budget', { tag: '@chromium' }, async ({ page }) => {
  36 |     const delay = 1000 + Math.floor(Math.random() * 2000);
  37 |     await page.goto('/');
  38 |     await page.waitForTimeout(delay);
  39 |     expect(delay, 'Simulated slow dependency exceeded 2s budget').toBeLessThan(2000);
  40 |   });
  41 | });
  42 | 
```