# spotter-frontend

React + Vite web app for Spotter (source lives in `apps/web`).

**Setup and day-to-day workflow** (with or without Docker) are in [spotter-infrastructure's getting-started guide](../spotter-infrastructure/docs/getting-started.md) — that's the doc to follow first. This README covers frontend-specific reference details only.

## Environment variables

The app reads its API base URL from `VITE_API_BASE_URL` (see `src/services/api.ts`). Vite loads env files per mode:

| File                | Mode          | Used by                        |
|---------------------|---------------|---------------------------------|
| `.env`              | local default | `yarn dev` (no `--mode` flag)   |
| `.env.development`  | `development` | `yarn dev:development`          |
| `.env.staging`      | `staging`     | `yarn dev:staging` / `yarn build:staging` |
| `.env.production`   | `production`  | `yarn build` (Vite's default build mode) |

None of these files are committed — only `.env.example` is. Copy it to create the one(s) you need:

```bash
cp .env.example .env               # local (nginx proxy, e.g. VITE_API_BASE_URL=/api)
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production
```

Then fill in `VITE_API_BASE_URL` in each — see the comments in `.env.example` for the expected value per environment.

## Scripts

`yarn dev` starts Vite on `http://localhost:5173` with hot module reload (local mode, `.env`). Mode variants: `yarn dev:development` (`.env.development`), `yarn dev:staging` (`.env.staging`).

Other scripts:

```bash
yarn build            # tsc -b && vite build (production mode)
yarn build:staging    # tsc -b && vite build --mode staging
yarn preview          # preview the production build
yarn lint             # eslint .
yarn typecheck        # tsc --noEmit
yarn test             # vitest run
yarn test:watch       # vitest
yarn test:coverage    # vitest run --coverage
yarn format           # prettier --write .
yarn format:check     # prettier --check .
```

> Note: the type-check script is named `typecheck`, not `check` — Yarn 1 has its own built-in `yarn check` command that silently shadows a package.json script of the same name, so `check` was renamed to avoid it.

### Coverage thresholds

`yarn test:coverage` reports via `@vitest/coverage-v8` (`text`, `html`, `json-summary`) and enforces minimums: **70% lines, 70% functions, 70% statements, 60% branches**. These are starting values for the current foundation — raise them feature by feature as the app grows, never lower them to make a change pass.

### Before pushing

Run the full quality check — lint, type-check, format-check, and build:

```bash
yarn quality
```

Fix anything it reports before opening a PR.

## Continuous integration

GitHub Actions workflows in `.github/workflows/`:

| Workflow | File | Job name | Triggers | Purpose |
| --- | --- | --- | --- | --- |
| Frontend CI | `ci.yml` | `frontend-quality` | PRs to `develop`/`main`, pushes to `develop` | Runs `yarn quality` (lint, typecheck, format, unit/RTL/MSW tests, Playwright, build) |
| CodeQL | `codeql.yml` | `codeql` | PRs, pushes to `develop`, weekly schedule | Static analysis for JavaScript/TypeScript — analysis runs and can fail the job on a real error, but results upload to GitHub is disabled (see below) |

Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm dependencies (in `apps/web`) and GitHub Actions versions.

## Continuous deployment

`deploy-development.yml` deploys to the Development server on every push to `develop`. It runs the same quality gate as Frontend CI (`yarn quality`) as its own `quality` job first, and the `deploy` job only runs if that passes — a commit that fails quality is never deployed. (It cannot instead trigger via `workflow_run` off Frontend CI's completion: GitHub only discovers `workflow_run` listener workflows from the copy of the file on the repo's default branch, `main`, not `develop`, so a Frontend CI run on `develop` would never fire it.) It syncs the repository to the server via `rsync` over SSH, then rebuilds and restarts only the `webserver` container (`docker compose ... up -d --build webserver`) — it never touches Postgres, Redis, or the backend, and never runs `docker compose down`.

This workflow also declares `workflow_dispatch`, but the manual "Run workflow" button in the Actions tab only appears for workflow files that exist on the default branch (`main`) — it will not show up while this file lives only on `develop`.

Only one Development deployment runs at a time; starting a new one cancels an older one still in progress.

**CodeQL is informative, not a merge gate.** Analysis genuinely runs and still fails the job on a real error, but results upload to GitHub's code scanning dashboard requires GitHub Advanced Security, unavailable for private repos on this org's current Free plan. SARIF output is uploaded as a workflow artifact (`codeql-sarif-results`) instead — download it from the run's Summary page. Findings won't appear as GitHub security alerts, and `codeql` should not be configured as a required merge check, until GitHub Advanced Security is enabled; see [spotter-infrastructure's README](../spotter-infrastructure/README.md#codeql-analysis-runs-upload-is-disabled-same-plan-limitation) for details.

**Required status checks** need to be configured in the repo's branch protection settings once these workflows have run at least once on a PR (GitHub only lets you pick from checks that have already reported). See the note in [spotter-infrastructure's README](../spotter-infrastructure/README.md#continuous-integration) about the current plan limitation on enforcing this today.

## Running with Docker

This service is one of five containers (`webserver`, `spotter-frontend`, `spotter-backend`, `postgres`, `redis`) owned by [spotter-infrastructure](../spotter-infrastructure); see its [getting-started guide](../spotter-infrastructure/docs/getting-started.md) to start it.

The container uses `Dockerfile.dev` and bind-mounts `apps/web/`, so code changes reload automatically without rebuilding the image (`CHOKIDAR_USEPOLLING` is set so file-watching works on macOS bind mounts). Rebuild (`--build`) only when `package.json`/`yarn.lock` or the Dockerfile itself changes.
