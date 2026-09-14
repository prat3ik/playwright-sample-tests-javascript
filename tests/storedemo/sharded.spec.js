// @ts-check
import { test } from './support.js';
import { journeys } from './journeys.js';

/**
 * Run mode 2: sharded across two machines, two workers each.
 *
 * Parallel mode is required: without it this whole file is a single test group,
 * and `--shard` would put all 20 journeys on one machine.
 *
 *   machine 1: npm run storedemo:sharded -- --shard=1/2
 *   machine 2: npm run storedemo:sharded -- --shard=2/2
 *
 * Give both machines the same TESTDINO_CI_RUN_ID so TestDino shows one run.
 */

test.describe.configure({ mode: 'parallel' });

test.describe('storedemo · sharded', () => {
  for (const journey of journeys) {
    test(journey.title, journey.run);
  }
});
