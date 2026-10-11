const assert = require('node:assert/strict');
const { test } = require('node:test');
const { REQUIRED_CHECKS, evaluateChecks, waitForChecks } = require('./deployment-gate.cjs');
const green = () => REQUIRED_CHECKS.map(name => ({ name, status: 'completed', conclusion: 'success' }));

test('all required checks must pass; missing checks and neutral results cannot authorize deployment', () => {
  assert.equal(evaluateChecks(green()).state, 'ready');
  assert.equal(evaluateChecks([]).state, 'pending');
  assert.equal(evaluateChecks(green().slice(1)).state, 'pending');
  assert.equal(evaluateChecks(green().map(check => ({ ...check, conclusion: 'neutral' }))).state, 'pending');
});

test('failed, cancelled, skipped and incomplete checks cannot authorize deployment', () => {
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    const checks = green();
    checks[0].conclusion = conclusion;
    assert.equal(evaluateChecks(checks).state, 'failed');
  }
  const checks = green();
  checks[0].status = 'in_progress';
  checks[0].conclusion = null;
  assert.equal(evaluateChecks(checks).state, 'pending');
});

test('a duplicate failed check is not hidden by a successful one', () => {
  assert.equal(evaluateChecks([...green(), { name: REQUIRED_CHECKS[0], status: 'completed', conclusion: 'failure' }]).state, 'failed');
});

test('gate requests checks for the exact deployment commit', async () => {
  const context = { repo: { owner: 'example', repo: 'spotter' }, sha: 'exact-deployment-sha' };
  const github = {
    rest: { checks: { listForRef: 'checks-endpoint' } },
    paginate: async (endpoint, options) => {
      assert.equal(endpoint, 'checks-endpoint');
      assert.equal(options.ref, context.sha);
      return green();
    },
  };
  await waitForChecks({ github, context, core: { setFailed: () => assert.fail('Unexpected failure') } });
});
