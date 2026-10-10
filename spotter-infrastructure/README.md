# spotter-infrastructure

Shared Docker Compose and Nginx setup for Spotter. This repository owns the reverse proxy, local Postgres/Redis containers, and the Compose files that wire the frontend and backend repos together — it does not contain application code.

**New here?** Setup steps and the day-to-day workflow (with and without Docker) are in [docs/getting-started.md](docs/getting-started.md) — that's the single doc to follow, not this README.

## Wildcard local DNS (optional, advanced)

[docs/getting-started.md](docs/getting-started.md) covers the simple `/etc/hosts` option. If you want every local domain on a TLD to resolve automatically instead of adding entries one at a time:

1. Install `dnsmasq` (e.g. `brew install dnsmasq`).
2. Configure it to answer for your chosen TLD, e.g. add to `dnsmasq.conf`:
   ```text
   address=/.test/127.0.0.1
   ```
3. Add a macOS resolver for that TLD so the system routes lookups for it to `dnsmasq`:
   ```text
   # /etc/resolver/test
   nameserver 127.0.0.1
   ```
4. Restart `dnsmasq`.

This affects your whole machine's DNS resolution and requires `sudo` — set it up deliberately, not as a required step.

## Troubleshooting

**Port 80 already in use / webserver fails to start:**

```bash
lsof -nP -iTCP:80 -sTCP:LISTEN
```

Common culprits: a native/Homebrew Nginx or Apache running as a system service, or another Docker Compose project already publishing port 80. Stop whatever's holding it, then retry `docker compose -f docker-compose.local.yml up -d`.

**Stale container / "container name already in use" errors:**

Usually means a previous stack (this one or another project) still has containers with the same names. Check what's running and stop it first:

```bash
docker ps -a
docker compose -f docker-compose.local.yml down   # or whichever project's compose file is holding the containers
```

**A code change isn't showing up:**

- Source edits should hot-reload automatically — check `docker compose -f docker-compose.local.yml logs -f <service>` for errors.
- If you changed a dependency, did you `docker compose -f docker-compose.local.yml restart <service>`?
- If you changed a Dockerfile, did you rebuild with `--build --force-recreate`?
- As a last resort, a stale frontend `node_modules` volume can get out of sync — recreate just that container: `docker compose -f docker-compose.local.yml rm -sf <service> && docker compose -f docker-compose.local.yml up -d <service>`.

## Environment files

- `.env.example` here is committed and contains safe local-only placeholders for the shared Postgres container (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`). Copy it to `.env` before running Compose.
- `.env` is gitignored — never commit it.
- **Backend application runtime settings do not live here.** They live in `../spotter-backend/.env` (its own `.env.example` documents `DATABASE_URL`, `CORS_ORIGIN`, etc.). This repo's `.env` only configures the Postgres container's own credentials, which the backend's `DATABASE_URL` is built from inside `docker-compose.local.yml`.

## Building a production-style webserver image (Development or Production)

Both `docker-compose.development.yml` and `docker-compose.prod.yml` build `webserver` with `context: ..` (the workspace root) using `webserver/Dockerfile.prod`, so it can reach both `../spotter-frontend` and this repo's `webserver/`. The workspace root holds many unrelated projects, so a `.dockerignore` **at the workspace root** (not in this repo) is required to keep that build context to only what's needed — most importantly, to guarantee `spotter-backend/.env` is never sent to Docker.

This repo tracks the verified rules for that file as [`workspace.dockerignore`](workspace.dockerignore). Before building either image, copy it into place at the workspace root:

```bash
cp workspace.dockerignore ../.dockerignore
docker compose -f docker-compose.development.yml build webserver   # or docker-compose.prod.yml
```

Do this in CI/deployment too — the workspace-root `.dockerignore` isn't part of this repo's own tree (it has to live one level up to apply to that wider build context), so any pipeline that builds either image needs this same copy step before the build, using the checked-out copy of `workspace.dockerignore` from this repo.

## Full-stack smoke tests

`tests/e2e/smoke.spec.ts` verifies the frontend, backend, and Nginx together — it targets an **already-running** stack and never starts Vite or Django itself.

```bash
yarn install   # first time only
E2E_BASE_URL=http://<your-local-domain> yarn test:e2e
```

See [tests/README.md](tests/README.md) for what's covered and what's deliberately deferred (there's no auth test yet — that domain doesn't exist).

## One-shot workspace verification

```bash
./scripts/verify-workspace.sh --domain <your-local-domain>
```

Runs, in order, stopping on the first failure: sibling-directory check → backend `make quality` → frontend `yarn quality` → dev/prod Compose config validation → starts the dev stack if it isn't already running → waits for Postgres/Redis to be healthy → backend tests (inside the container) → this repo's Playwright smoke tests.

This is the **local equivalent of what CI now runs automatically** (see [Continuous integration](#continuous-integration) below) — it is not a replacement for each repository's own CI workflow, it's the same checks runnable by hand. It never runs `docker compose down -v` and never touches existing volumes.

## Continuous integration

GitHub Actions workflows across all three repos, from Epic 07:

| Workflow | Repo | File | Job name(s) | Triggers | Purpose |
| --- | --- | --- | --- | --- | --- |
| Frontend CI | frontend | `ci.yml` | `frontend-quality` | PRs to `develop`/`main`, pushes to `develop` | `yarn quality` (lint, typecheck, format, tests, Playwright, build) |
| Backend CI | backend | `ci.yml` | `backend-quality`, `backend-database-tests` | PRs to `develop`/`main`, pushes to `develop` | `make quality` (ruff + Django tests) against a disposable CI-only PostgreSQL service |
| Docker Validation | infrastructure | `docker-validation.yml` | `docker-validation` | PRs to `develop`/`main`, pushes to `develop` | Validates and builds Local, Development, and Production Compose files with the three repos checked out as siblings |
| Full-Stack E2E Smoke | infrastructure | `e2e.yml` | `e2e-smoke` | PRs to `develop`/`main`, pushes to `develop` | Starts the real dev stack in CI and runs the Playwright smoke tests (UI + `/api/health`) through Nginx |
| CodeQL | all three | `codeql.yml` | `codeql` | PRs, pushes to `develop`, weekly | Static analysis for JavaScript/TypeScript — informative only for now, see below |

Dependabot (`.github/dependabot.yml` in each repo) opens weekly PRs for dependency and GitHub Actions updates.

### Cross-repository checkout: required secret

`docker-validation.yml` and `e2e.yml` both check out `spotter-frontend` and `spotter-backend` as sibling directories alongside `spotter-infrastructure`, matching the local dev layout. All three are **private repositories**, and the default `GITHUB_TOKEN` a workflow receives only has access to the repo it's running in — it cannot check out sibling private repos in the same org, even under the same organization.

**Required secret:** `CROSS_REPO_CHECKOUT_TOKEN`, added as a repository secret on `spotter-infrastructure` (Settings → Secrets and variables → Actions).

Use one of:
- A **fine-grained personal access token** scoped to exactly `spotter-frontend` and `spotter-backend`, with repository permission **Contents: Read** (nothing else needed just to check out code).
- A **GitHub App installation token** with the same `Contents: Read` permission, installed on those two repos. More setup, but doesn't tie the token to a specific person's account.

Without this secret, `docker-validation.yml` and `e2e.yml` will fail at the "Check out spotter-frontend" / "Check out spotter-backend" step with a permission error — `frontend-quality`, `backend-quality`, and `backend-database-tests` (which each run inside their own repo, no cross-repo checkout needed) are unaffected.

### Dependency review: not available on the current plan

`actions/dependency-review-action` requires GitHub Advanced Security, which isn't available for private repositories on this organization's current **Free** plan. Rather than add a workflow that would fail on every PR, it's omitted entirely for now. Add `.github/workflows/dependency-review.yml` (checkout + `actions/dependency-review-action@v4`) to each repo once the org upgrades to a plan that includes Advanced Security for private repos.

### CodeQL: analysis runs, upload is disabled (same plan limitation)

CodeQL analysis genuinely runs in CI in all three repos — it still fails the job on a real setup or analysis error. What's disabled is only the final step that uploads results to GitHub's code scanning dashboard (`upload: false` on the analyze step, with an explicit `output: sarif-results` and that directory uploaded as a workflow artifact with `if: always()` — no `continue-on-error` on the analysis step itself, so genuine failures still fail the job), because that upload requires GitHub Advanced Security, unavailable for private repos on the current Free plan.

Instead, each run uploads its SARIF output as a workflow artifact (`codeql-sarif-results`) — download it from the run's Summary page to inspect findings locally (e.g. open it with the [SARIF Viewer VS Code extension](https://marketplace.visualstudio.com/items?itemName=MS-SARIFVSCode.sarif-viewer)) until GitHub Advanced Security is enabled. GitHub's own Code Security documentation treats SARIF as the portable format for static-analysis results, which is exactly what this preserves.

**CodeQL is informative, not a merge gate.** The workflow proves CodeQL can analyze the code and gives you a downloadable SARIF file, but findings won't appear as GitHub security alerts, and `codeql` should not be configured as a required merge check, until GitHub Advanced Security is enabled. Once it is, remove `upload: false`/`output`/the artifact-upload step to restore normal GitHub code scanning, and add `codeql` to the required checks below at that point.

### Required status checks (configure after upgrading to GitHub Team)

This organization's current plan cannot enforce branch protection rulesets, so none have been configured. Once available, require these exact check names on `develop` and `main`:

```text
frontend-quality
backend-quality
backend-database-tests
docker-validation
e2e-smoke
```

`codeql` is deliberately excluded from this list — see above. GitHub only lets you select a check as "required" after it has reported at least once on a pull request — merge one PR with these workflows active first, then configure branch protection.

## Environments and Compose files

| Environment | Compose file | Frontend | Hot reload | Postgres/Redis | Notes |
| --- | --- | --- | --- | --- | --- |
| **Local** | `docker-compose.local.yml` | Vite dev server, bind-mounted source | Yes | Yes | Your machine. See [docs/getting-started.md](docs/getting-started.md). |
| **Development** | `docker-compose.development.yml` | Production build, baked into the webserver image | No | Yes | Remote server, `dev.spotter.com`. See [docs/deployment.md](docs/deployment.md). |
| **Production** | `docker-compose.prod.yml` | Production build, baked into the webserver image | No | External/managed (not in this Compose file) | See [docs/deployment.md](docs/deployment.md). |

All environments: only `webserver` publishes host ports; Postgres, Redis, and the backend are private Docker-network services with health checks; named volumes persist data.

See [docs/local-development.md](docs/local-development.md) for Local's service/port details and [docs/deployment.md](docs/deployment.md) for the full deployment plan.
