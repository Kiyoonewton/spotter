const REQUIRED_CHECKS = [
  'Django backend', 'Frontend quality and build', 'frontend-quality',
  'docker-validation', 'e2e-smoke', 'file-length',
  'codeql (python)', 'codeql (javascript-typescript)', 'CodeQL',
];

function evaluateChecks(checks) {
  const relevant = checks.filter(check => REQUIRED_CHECKS.includes(check.name));
  const failures = relevant.filter(check => check.status === 'completed' &&
    !['success', 'neutral'].includes(check.conclusion));
  if (failures.length) return { state: 'failed', names: failures.map(check => check.name) };
  const complete = REQUIRED_CHECKS.every(name => {
    const matches = relevant.filter(check => check.name === name);
    return matches.length && matches.every(check => check.status === 'completed' && check.conclusion === 'success');
  });
  return { state: complete ? 'ready' : 'pending' };
}

async function waitForChecks({ github, core, context }) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const checks = await github.paginate(github.rest.checks.listForRef, {
      ...context.repo, ref: context.sha, per_page: 100, filter: 'latest',
    });
    const result = evaluateChecks(checks);
    if (result.state === 'failed') {
      core.setFailed(`CI failed: ${result.names.join(', ')}`);
      return;
    }
    if (result.state === 'ready') return;
    core.info('Waiting for all required checks on the deployment commit');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  core.setFailed('Required CI checks did not complete successfully within 20 minutes');
}

module.exports = { REQUIRED_CHECKS, evaluateChecks, waitForChecks };
