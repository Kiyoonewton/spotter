# Spotter / Waycast

Weather-aware truck route comparison built with React, TypeScript, Material UI,
Django REST Framework, PostgreSQL and Redis. Docker Compose and Nginx serve the
frontend Node runtime and API under one origin.

**Public workspace:** https://spotter.kiyoo.online/

Enter a trip, compare route exposure, inspect checkpoint arrival weather and
explore hourly weather through the longest journey. The “Why this route?” panel
shows the ranking criteria and the driving-time/distance trade-off against the
fastest eligible alternative. API recommendations remain authoritative.

## Repository

| Directory | Responsibility |
| --- | --- |
| `spotter-frontend/apps/web` | React/MUI workspace, typed API clients, request/selection hooks, unit and browser tests |
| `spotter-backend` | Django APIs, provider adapters, checkpoint sampling, deterministic risk and ranking |
| `spotter-infrastructure` | Docker Compose, Nginx, deployment/backup scripts and full-stack browser checks |
| `docs` | Provider configuration, forecast semantics, cache/readiness documentation |

## Run with Docker

```sh
cp spotter-backend/.env.example spotter-backend/.env
cp spotter-infrastructure/.env.example spotter-infrastructure/.env
cd spotter-infrastructure
docker compose -f docker-compose.local.yml up -d --build
```

Follow [infrastructure setup](spotter-infrastructure/docs/getting-started.md)
for environment and gateway configuration. Configure server-only
`OPENCAGE_API_KEY` and `HERE_API_KEY` for live locations/routing. Demo mode requires
no external provider credentials. Never commit filled environment files.

## Review and verification

- [Assessment behavior, architecture and limitations](spotter-frontend/apps/web/ASSESSMENT.md)
- [Provider setup and normalization](docs/providers.md)
- [Hourly forecast semantics, caching and readiness](docs/corridor-forecast.md)
- [Contribution rules](AGENTS.md)

From the frontend directory, run `yarn typecheck`, `yarn lint`,
`yarn format:check`, `yarn test`, `yarn test:e2e` and `yarn build`.
Install Chromium with `yarn playwright install chromium` before browser tests.
From the backend directory, install requirements, then run
`python manage.py check` and `python manage.py test`.
Run `bash scripts/check-file-lengths.sh` from the repository root.

GitHub Actions check frontend/backend behavior, responsive browser journeys,
full-stack requests through Nginx, container builds, deployment/backup behavior,
CodeQL and the 300-line authored-file policy. Fixture tests and live-provider
verification are distinct evidence; a passing build does not prove weather accuracy.

## Important limits

Live checkpoint timing uses a distance-proportional driving estimate; driver
breaks are not modeled. Truck mode does not yet accept a configurable vehicle
profile. Missing forecasts remain Unknown, and blocked/incomplete routes cannot
win eligible ranking. Map weather circles are sampled forecasts, not radar.
Completed browser analyses can be restored or shared through seven-day token links,
with a printable driver briefing. See [saved analysis behavior](docs/saved-analyses.md).
Weather-only [Route × Departure comparison](docs/departure-comparison.md) evaluates
four departure windows without altering the saved result. Full time-dependent
rerouting and a React Native companion remain future milestones.
