const assert = require('node:assert/strict');
const { test } = require('node:test');
const { REQUIRED_CHECKS, SECURITY_CATEGORIES, evaluateChecks, evaluateSecurity, waitForChecks } = require('./deployment-gate.cjs');
const context = { repo: { owner: 'example', repo: 'spotter' }, sha: 'exact-deployment-sha', ref: 'refs/heads/develop' };
const green = () => REQUIRED_CHECKS.map(name => ({ name, status: 'completed', conclusion: 'success' }));
const analyses = () => SECURITY_CATEGORIES.map(category => ({ category, tool: { name: 'CodeQL' }, ref: context.ref, commit_sha: context.sha, error: '', rules_count: 100 }));

function fakeGithub(checks = green(), security = analyses(), alerts = []) {
  return {
    rest: { checks: { listForRef: 'checks-endpoint' } },
    paginate: async (endpoint, options) => {
      if (endpoint === 'checks-endpoint') {
        assert.equal(options.ref, context.sha);
        return checks;
      }
      assert.equal(options.ref, context.ref);
      assert.equal(options.tool_name, 'CodeQL');
      if (endpoint.endsWith('/analyses')) return security;
      assert.equal(options.state, 'open');
      return alerts;
    },
  };
}

const noFailure = { info() {}, setFailed: () => assert.fail('Unexpected gate failure') };

test('push checks pass without PR aggregate; missing/neutral checks do not', () => {
  assert.equal(evaluateChecks(green()).state, 'ready');
  assert.equal(evaluateChecks([]).state, 'pending');
  assert.equal(evaluateChecks(green().slice(1)).state, 'pending');
  assert.equal(evaluateChecks(green().map(check => ({ ...check, conclusion: 'neutral' }))).state, 'pending');
});

test('present PR aggregate remains enforced, including pending and failure', () => {
  for (const [status, conclusion, expected] of [['completed', 'success', 'ready'], ['in_progress', null, 'pending'], ['completed', 'failure', 'failed'], ['completed', 'neutral', 'pending']]) {
    assert.equal(evaluateChecks([...green(), { name: 'CodeQL', status, conclusion }]).state, expected);
  }
});

test('failed, cancelled, skipped and incomplete checks cannot authorize deployment', () => {
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    const checks = green(); checks[0].conclusion = conclusion;
    assert.equal(evaluateChecks(checks).state, 'failed');
  }
  const checks = green(); checks[0].status = 'in_progress'; checks[0].conclusion = null;
  assert.equal(evaluateChecks(checks).state, 'pending');
  assert.equal(evaluateChecks([...green(), { name: REQUIRED_CHECKS[0], status: 'completed', conclusion: 'failure' }]).state, 'failed');
});

test('security results must cover both languages at exact ref and commit', () => {
  assert.equal(evaluateSecurity(analyses(), [], context).state, 'ready');
  assert.equal(evaluateSecurity(analyses().slice(1), [], context).state, 'pending');
  for (const change of [{ commit_sha: 'old-sha' }, { ref: 'refs/heads/main' }, { error: 'failed scan' }, { rules_count: 0 }, { tool: { name: 'Other' } }]) {
    assert.equal(evaluateSecurity(analyses().map(analysis => ({ ...analysis, ...change })), [], context).state, 'pending');
  }
  assert.equal(evaluateSecurity(analyses(), [{ state: 'open' }], context).state, 'failed');
});

test('gate queries exact SHA and branch, then succeeds only with no open alerts', async () => {
  await waitForChecks({ github: fakeGithub(), context, core: noFailure });
});

test('open alerts fail deployment without dismissing or suppressing them', async () => {
  let message;
  await waitForChecks({ github: fakeGithub(green(), analyses(), [{ state: 'open' }]), context,
    core: { info() {}, setFailed(value) { message = value; } } });
  assert.match(message, /1 open CodeQL alerts/);
});

test('security API denial fails safely instead of permitting deployment', async () => {
  let message;
  const github = fakeGithub();
  const original = github.paginate;
  github.paginate = (endpoint, options) => {
    if (endpoint === 'checks-endpoint') return original(endpoint, options);
    throw Object.assign(new Error('FAKE_TOKEN internal detail'), { status: 403 });
  };
  await waitForChecks({ github, context, core: { info() {}, setFailed(value) { message = value; } } });
  assert.match(message, /HTTP 403/);
  assert.doesNotMatch(message, /FAKE_TOKEN|internal detail/);
});

test('stale security analyses time out rather than allowing old results', async () => {
  let message;
  await waitForChecks({ github: fakeGithub(green(), []), context,
    core: { info() {}, setFailed(value) { message = value; } }, maxAttempts: 1, sleep: async () => {} });
  assert.match(message, /timeout/);
});
