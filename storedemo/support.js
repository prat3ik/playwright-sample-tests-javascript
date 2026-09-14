// @ts-check
import { test as base, expect } from '@playwright/test';

/**
 * Shared fixtures and helpers for the storedemo.testdino.com journeys.
 *
 * Durations are deliberately uneven so shard balancing has something to fix.
 * Each journey is dealt a duration tier (≤10s, ≤20s, ≤1m, ≤2m, ≤4m) and a
 * target inside that tier by a seeded shuffle: random, but identical on every
 * run and every machine, so duration history stays predictive. A journey
 * only gets a tier its real work fits in (see `minTier` in journeys.js).
 *
 * A journey does its real work first; if it finishes before its target, the
 * `pacing` fixture keeps the shopper scrolling the current page until the
 * target is reached. Failed tests end immediately.
 *
 *   STOREDEMO_DURATION_SEED   reshuffle tiers (default "storedemo")
 *   STOREDEMO_PACING=off      no padding, no pauses (for debugging selectors)
 *   STOREDEMO_THINK_MS        pause between steps in ≥1m journeys (default 1500)
 */

const PACING = process.env.STOREDEMO_PACING !== 'off';
const SEED = process.env.STOREDEMO_DURATION_SEED || 'storedemo';
const THINK_MS = Number(process.env.STOREDEMO_THINK_MS ?? 1_500);

/** Tier name → how many journeys get it, and the target range in seconds. */
export const DURATION_TIERS = [
  { name: '10s', count: 5, range: [5, 9] },
  { name: '20s', count: 5, range: [12, 19] },
  { name: '1m', count: 4, range: [35, 58] },
  { name: '2m', count: 4, range: [75, 115] },
  { name: '4m', count: 2, range: [180, 235] },
];
const TIER_RANK = Object.fromEntries(DURATION_TIERS.map((t, i) => [t.name, i]));

export const PASSWORD = 'Password@123';

/** mulberry32, seeded from an FNV-1a hash of the seed string. */
function seededRandom(seed) {
  let a = 2166136261;
  for (const ch of seed) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** title → { tier, targetMs, thinkMs } */
const durationPlan = new Map();

/**
 * Deals duration tiers to journeys. Deterministic for a given seed, so every
 * spec file, worker and machine computes the same plan.
 */
export function planDurations(journeys) {
  const random = seededRandom(SEED);
  const slots = shuffle(DURATION_TIERS.flatMap((t) => Array(t.count).fill(t)), random);
  if (slots.length !== journeys.length) {
    throw new Error(`DURATION_TIERS has ${slots.length} slots for ${journeys.length} journeys`);
  }
  // Most constrained journeys pick first so every journey finds a tier it fits.
  const byConstraint = shuffle(journeys, random).sort(
    (a, b) => TIER_RANK[b.minTier ?? '10s'] - TIER_RANK[a.minTier ?? '10s'],
  );
  durationPlan.clear();
  for (const journey of byConstraint) {
    const index = slots.findIndex((t) => TIER_RANK[t.name] >= TIER_RANK[journey.minTier ?? '10s']);
    if (index < 0) throw new Error(`no duration tier left for "${journey.title}"`);
    const [tier] = slots.splice(index, 1);
    const [lo, hi] = tier.range;
    durationPlan.set(journey.title, {
      tier: tier.name,
      targetMs: Math.round((lo + random() * (hi - lo)) * 1000),
      thinkMs: TIER_RANK[tier.name] >= TIER_RANK['1m'] ? THINK_MS : 0,
    });
  }
  return durationPlan;
}

function planFor(title) {
  return durationPlan.get(title) ?? { tier: 'unplanned', targetMs: 0, thinkMs: 0 };
}

/** Test details that label a journey with its duration tier in reports. */
export function durationDetails(title) {
  const { tier, targetMs } = planFor(title);
  return { annotation: { type: 'duration-tier', description: `≤${tier}, target ${Math.round(targetMs / 1000)}s` } };
}

export const test = base.extend({
  pacing: [
    async ({ page }, use, testInfo) => {
      const startedAt = Date.now();
      const { targetMs } = planFor(testInfo.title);
      await use();
      if (!PACING || testInfo.status !== testInfo.expectedStatus || page.isClosed()) return;
      if (Date.now() - startedAt >= targetMs) return;

      await test.step('Keep browsing the current page', async () => {
        let direction = 1;
        while (Date.now() - startedAt < targetMs) {
          const atEdge = await page.evaluate((dir) => {
            window.scrollBy({ top: dir * 450, behavior: 'smooth' });
            const bottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 5;
            return dir > 0 ? bottom : window.scrollY <= 0;
          }, direction);
          if (atEdge) direction = -direction;
          await page.waitForTimeout(Math.min(2_000, Math.max(0, targetMs - (Date.now() - startedAt))));
        }
      });
    },
    { auto: true },
  ],
});

export { expect };

/** A human pause between steps; skipped in ≤10s and ≤20s journeys unless ms is given. */
export async function think(page, ms) {
  const pause = ms ?? (PACING ? planFor(test.info().title).thinkMs : 0);
  if (pause > 0) await page.waitForTimeout(pause);
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
