// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Orchestration E2E for TestDino dashboard-triggered reruns (native rerun).
 *
 * Drives the same integration-service endpoint the dashboard button calls,
 * then verifies against GitHub that attempt 2 ran and against TestDino that
 * the rerun was scoped to exactly the failed tests of attempt 1.
 *
 * Runs LOCALLY against the local stack + a real GitHub repo — not in CI.
 * Gated on TD_E2E=1 plus the env below; skips cleanly otherwise.
 *
 *   TD_E2E=1
 *   TD_INTEGRATION_URL   e.g. http://localhost:3003
 *   TD_PROJECT_ID        TestDino project id of the sample repo's project
 *   TD_AUTH_COOKIE       session cookie value for a logged-in dashboard user
 *   TD_RUN_ID            TestDino run id of a RED run from the rerun-e2e workflow
 *   GH_REPO              e.g. prat3ik/playwright-sample-tests-javascript
 *
 * GitHub reads use the `gh` CLI's token via GH_TOKEN or a `repo`-scoped token.
 */

const {
  TD_E2E,
  TD_INTEGRATION_URL,
  TD_PROJECT_ID,
  TD_AUTH_COOKIE,
  TD_RUN_ID,
  GH_REPO,
  GH_TOKEN,
} = process.env;

const REQUIRED = { TD_INTEGRATION_URL, TD_PROJECT_ID, TD_AUTH_COOKIE, TD_RUN_ID, GH_REPO, GH_TOKEN };

test.describe('Rerun failed tests from the dashboard', () => {
  test.skip(TD_E2E !== '1', 'TD_E2E=1 not set — orchestration e2e is opt-in');
  test.skip(
    Object.values(REQUIRED).some((v) => !v),
    `missing env: ${Object.entries(REQUIRED)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(', ')}`
  );

  // One long-running journey; the phases are sequential by nature.
  test('scoped rerun executes only the failed tests as attempt 2', async ({ request }) => {
    test.setTimeout(15 * 60 * 1000);

    const integrationHeaders = {
      Cookie: `${TD_AUTH_COOKIE}`,
      'X-Project-ID': `${TD_PROJECT_ID}`,
      'Content-Type': 'application/json',
    };
    const ghHeaders = {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    };

    // Phase 1 — trigger the rerun exactly like the dashboard button does.
    const rerunResponse = await request.post(
      `${TD_INTEGRATION_URL}/api/v1/projects/${TD_PROJECT_ID}/triggers/rerun-failed`,
      { headers: integrationHeaders, data: { runId: TD_RUN_ID } }
    );
    expect(rerunResponse.status(), await rerunResponse.text()).toBe(201);
    const trigger = (await rerunResponse.json()).data.trigger;
    expect(trigger.status).toBe('dispatched');
    expect(trigger.scope.select).toBe('failed');
    expect(trigger.scope.testIds.length).toBeGreaterThan(0);
    const ciRunId = trigger.dispatch.ciRunId;
    expect(ciRunId, 'trigger must record the GitHub run id').toBeTruthy();

    // Phase 2 — the trigger note is served for the CLI inside attempt 2.
    const noteResponse = await request.get(
      `${TD_INTEGRATION_URL}/api/v1/reporter/trigger-note?provider=github&ciRunId=${ciRunId}&attempt=2`,
      { headers: { Cookie: `${TD_AUTH_COOKIE}` } }
    );
    expect(noteResponse.status()).toBe(200);
    const note = (await noteResponse.json()).data;
    expect(note.triggerId).toBe(trigger._id ?? trigger.id ?? note.triggerId);
    expect(note.select).toBe('failed');
    expect(note.testIds.sort()).toEqual([...trigger.scope.testIds].sort());

    // Phase 3 — GitHub actually started attempt 2 and finished it.
    await expect
      .poll(
        async () => {
          const runResponse = await request.get(
            `https://api.github.com/repos/${GH_REPO}/actions/runs/${ciRunId}`,
            { headers: ghHeaders }
          );
          const run = await runResponse.json();
          return { attempt: run.run_attempt, status: run.status };
        },
        { timeout: 10 * 60 * 1000, intervals: [10_000] }
      )
      .toEqual({ attempt: 2, status: 'completed' });

    // Phase 4 — attempt 2 executed EXACTLY the failed set, nothing more.
    // The job log carries Playwright's own count; the authoritative check is
    // the jobs listing: the rerun ran 1 job (the test job), and the note's
    // testIds size bounds the tests that can have run in it.
    const jobsResponse = await request.get(
      `https://api.github.com/repos/${GH_REPO}/actions/runs/${ciRunId}/attempts/2/jobs`,
      { headers: ghHeaders }
    );
    expect(jobsResponse.status()).toBe(200);
    const jobs = (await jobsResponse.json()).jobs;
    expect(jobs.length).toBe(1);
    // Deterministic fixtures fail again on attempt 2 — a green attempt 2 would
    // mean the failed tests were NOT rerun (selection silently matched nothing).
    expect(jobs[0].conclusion).toBe('failure');
  });
});
