// @ts-check
import { test } from './support.js';
import { journeys } from './journeys.js';

/**
 * Run mode 1: simple sequential run.
 *
 * One machine, one worker, journeys execute one after another in file order.
 * A failure does not stop the remaining journeys.
 *
 *   npm run storedemo:sequential
 */

test.describe.configure({ mode: 'default' });

test.describe('storedemo · sequential', () => {
  for (const journey of journeys) {
    test(journey.title, journey.run);
  }
});
