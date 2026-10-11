const REQUIRED_CHECKS = [
  'Django backend', 'Frontend quality and build', 'frontend-quality',
  'docker-validation', 'e2e-smoke', 'file-length',
  'codeql (python)', 'codeql (javascript-typescript)',
];

function evaluateChecks(checks) {
  const relevant = checks.filter(check => [...REQUIRED_CHECKS, 'CodeQL'].includes(check.name));
  const failures = relevant.filter(check => check.status === 'completed' &&
    !['success', 'neutral'].includes(check.conclusion));
  if (failures.length) return { state: 'failed', names: failures.map(check => check.name) };
  const complete = REQUIRED_CHECKS.every(name => {
    const matches = relevant.filter(check => check.name === name);
    return matches.length && matches.every(check => check.status === 'completed' && check.conclusion === 'success');
  });
  const aggregate = relevant.filter(check => check.name === 'CodeQL');
  const aggregateReady = aggregate.every(check => check.status === 'completed' && check.conclusion === 'success');
  return { state: complete && aggregateReady ? 'ready' : 'pending' };
}

const SECURITY_CATEGORIES = ['/language:python', '/language:javascript-typescript'];

function evaluateSecurity(analyses, alerts, context) {
  const complete = SECURITY_CATEGORIES.every(category => analyses.some(analysis =>
    analysis.tool?.name === 'CodeQL' && analysis.ref === context.ref &&
    analysis.commit_sha === context.sha && analysis.category === category &&
    !analysis.error && analysis.rules_count > 0));
  if (!complete) return { state: 'pending' };
  const open = alerts.filter(alert => alert.state === 'open');
  if (open.length) return { state: 'failed', count: open.length };
  return { state: 'ready' };
}

async function waitForChecks({ github, core, context, maxAttempts = 120,
  sleep = () => new Promise(resolve => setTimeout(resolve, 10000)) }) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let result;
    let operation = 'CI checks';
    try {
      const checks = await github.paginate(github.rest.checks.listForRef, {
        ...context.repo, ref: context.sha, per_page: 100, filter: 'latest',
      });
      result = evaluateChecks(checks);
      if (result.state === 'ready') {
        const options = { ...context.repo, ref: context.ref, tool_name: 'CodeQL', per_page: 100 };
        operation = 'CodeQL analyses';
        const analyses = await github.paginate('GET /repos/{owner}/{repo}/code-scanning/analyses', options);
        operation = 'CodeQL alerts';
        const alerts = await github.paginate('GET /repos/{owner}/{repo}/code-scanning/alerts', { ...options, state: 'open' });
        result = evaluateSecurity(analyses, alerts, context);
      }
    } catch (error) {
      core.setFailed(`Unable to verify ${operation} (HTTP ${Number.isInteger(error.status) ? error.status : 'unknown'})`);
      return;
    }
    if (result.state === 'failed') {
      core.setFailed(result.names ? `CI failed: ${result.names.join(', ')}` : `Deployment blocked by ${result.count} open CodeQL alerts`);
      return;
    }
    if (result.state === 'ready') {
      core.info('Required checks and both exact-commit security analyses passed; no open branch CodeQL alerts');
      return;
    }
    core.info('Waiting for required checks and exact-commit branch security results');
    await sleep();
  }
  core.setFailed('Required CI/security results did not complete successfully within the deployment timeout');
}

module.exports = { REQUIRED_CHECKS, SECURITY_CATEGORIES, evaluateChecks, evaluateSecurity, waitForChecks };
