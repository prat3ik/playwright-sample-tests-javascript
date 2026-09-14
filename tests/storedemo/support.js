// @ts-check
import { test as base, expect } from '@playwright/test';

/**
 * Shared fixtures and helpers for the storedemo.testdino.com journeys.
 *
 * Every journey is meant to run for 1–2 minutes so run modes (sequential,
 * sharded, orchestrated) show realistic wall-clock differences. A journey does
 * its real work first; if it finishes early, the `pacing` fixture keeps the
 * shopper reading the current page (scrolling through it) until the test's
 * target duration is reached. Targets are spread between MIN and MAX based on
 * the test title, so durations are stable run to run but not all identical.
 *
 *   STOREDEMO_MIN_TEST_MS   lower bound of the target (default 65000)
 *   STOREDEMO_MAX_TEST_MS   upper bound of the target (default 110000)
 *   STOREDEMO_THINK_MS      pause between journey steps (default 1500)
 *
 * Set STOREDEMO_MIN_TEST_MS=0 to disable pacing while debugging selectors.
 */

const MIN_TEST_MS = Number(process.env.STOREDEMO_MIN_TEST_MS ?? 65_000);
const MAX_TEST_MS = Math.max(MIN_TEST_MS, Number(process.env.STOREDEMO_MAX_TEST_MS ?? 110_000));
const THINK_MS = Number(process.env.STOREDEMO_THINK_MS ?? 1_500);

export const PASSWORD = 'Password@123';

function targetDurationFor(title) {
  if (MIN_TEST_MS <= 0) return 0;
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return MIN_TEST_MS + (hash % (MAX_TEST_MS - MIN_TEST_MS + 1));
}

export const test = base.extend({
  pacing: [
    async ({ page }, use, testInfo) => {
      const startedAt = Date.now();
      await use();
      if (testInfo.status !== testInfo.expectedStatus || page.isClosed()) return;

      const target = targetDurationFor(testInfo.title);
      if (Date.now() - startedAt >= target) return;
      await test.step('Keep browsing the current page', async () => {
        let direction = 1;
        while (Date.now() - startedAt < target) {
          const atEdge = await page.evaluate((dir) => {
            window.scrollBy({ top: dir * 450, behavior: 'smooth' });
            const bottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 5;
            return dir > 0 ? bottom : window.scrollY <= 0;
          }, direction);
          if (atEdge) direction = -direction;
          await page.waitForTimeout(Math.min(2_000, Math.max(0, target - (Date.now() - startedAt))));
        }
      });
    },
    { auto: true },
  ],
});

export { expect };

/** A short human pause between steps. */
export async function think(page, ms = THINK_MS) {
  if (ms > 0) await page.waitForTimeout(ms);
}

export function uniqueEmail() {
  const { workerIndex, parallelIndex } = test.info();
  const rand = Math.random().toString(36).slice(2, 8);
  return `storedemo.${Date.now()}.${workerIndex}${parallelIndex}${rand}@example.com`;
}

export async function openHome(page) {
  await page.goto('/');
  await expect(page.getByTestId('hero-section')).toBeVisible({ timeout: 30_000 });
}

export async function openCatalogue(page) {
  await page.goto('/products');
  await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
}

export function productCards(page) {
  return page.locator('a[href^="/product/"]');
}

/**
 * Opens the nth catalogue product by clicking through. Product pages only
 * render on client-side navigation; a direct page.goto to /product/... hangs.
 */
export async function openNthProduct(page, n) {
  const card = productCards(page).nth(n);
  const name = (await card.locator('h1, h2, h3').first().innerText()).trim();
  await card.click();
  await expect(page.getByTestId('product-name')).toHaveText(name, { timeout: 30_000 });
  return name;
}

export async function addCurrentProductToCart(page) {
  await page.getByTestId('add-to-cart-button').click();
  await expect(page.getByRole('status').filter({ hasText: 'Added to the cart' }).first()).toBeVisible();
}

export async function openCartDrawer(page) {
  await page.getByTestId('header-cart-icon').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
}

export async function closeCartDrawer(page) {
  await page.getByTestId('close-cart').click();
}

/** Parses "$1,234.56" style prices. */
export function money(text) {
  return Number(String(text).replace(/[^0-9.]/g, ''));
}

export async function signUp(page, { firstName = 'Dino', lastName = 'Tester', email = uniqueEmail() } = {}) {
  await page.goto('/signup');
  await expect(page.getByTestId('signup-title')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('signup-firstname-input').fill(firstName);
  await page.getByTestId('signup-lastname-input').fill(lastName);
  await page.getByTestId('signup-email-input').fill(email);
  await page.getByTestId('signup-password-input').fill(PASSWORD);
  await page.getByTestId('signup-submit-button').click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 45_000 });
  return { firstName, lastName, email };
}

export async function logIn(page, email, password = PASSWORD) {
  await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-button').click();
}

export async function signUpAndLogIn(page, user) {
  const account = await signUp(page, user);
  await logIn(page, account.email);
  await expect(page.getByRole('status').filter({ hasText: 'Logged in successfully' }).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('hero-section')).toBeVisible({ timeout: 30_000 });
  return account;
}
