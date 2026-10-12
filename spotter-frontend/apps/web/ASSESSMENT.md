# Weather-aware dispatch workspace

React, TypeScript and Material UI connect to Django REST APIs. The deployed
workspace compares truck routes, evaluates forecast weather at checkpoint arrival
times, and presents the returned recommendation, route exposure and checkpoint
inspection. Docker Compose runs the frontend Node runtime, Django/Gunicorn,
PostgreSQL, Redis and Nginx.

## Product behavior

- Demo mode uses deterministic Chicago–Pittsburgh alternatives and weather.
- Live mode uses committed location coordinates from OpenCage, HERE truck routing,
  and Open-Meteo hourly wind, rain and snowfall. Keys remain server-side.
- Checkpoints belong to their routes, at 10/25/50-mile intervals and the destination.
- Risk thresholds and cargo-weight overrides are deterministic backend rules.
- Blocked and incomplete routes cannot be recommended; missing data stays Unknown.
- Eligible routes rank by Severe miles, High miles, distance-weighted average risk,
  duration, and stable route ID for exact ties. Selection never creates a recommendation.
- “Why this route?” compares returned metrics in priority order, identifies the
  first difference against the next eligible option, and quantifies driving time
  and distance relative to the fastest eligible route. An inconsistent returned
  winner is flagged rather than replaced.
- Live maps show provider geometry and route-owned checkpoints. Weather circles
  are sampled locations, not radar or a continuous corridor field.
- The manual weather timeline covers the longest alternative, rounded up to an
  hour. Preview time is independent of arrival-time risk and ranking.
- The truck preview follows owned segment geometry using modeled arrival timing;
  it is an estimate, not live GPS. Demo imagery is clearly illustrative.

## Run and verify

Use the Node version in `.nvmrc` and Yarn 1. From this directory:

```sh
yarn install --frozen-lockfile
yarn dev
yarn typecheck
yarn lint
yarn format:check
yarn test
yarn test:e2e
yarn build
```

Playwright needs Chromium (`yarn playwright install chromium`). The Vite API proxy
uses `VITE_API_PROXY_TARGET`, defaulting to `http://127.0.0.1:8000`.
From `spotter-backend`, install requirements and run:

```sh
python manage.py check
python manage.py test
```

See the root README for Docker startup, `docs/providers.md` for provider setup,
and `docs/corridor-forecast.md` for weather semantics and caching. GitHub Actions
run backend/frontend checks, browser journeys, Docker validation, CodeQL and the
300-line authored-file policy. Passing fixture tests does not establish live
provider accuracy; report live verification separately.

## Architecture

TanStack Start serves React through its Node runtime. `src/routes/index.tsx`
composes focused MUI components. Request/selection hooks protect against stale
responses and preserve successfully applied trip metadata. Django provider
adapters normalize external data before pure classification and ranking logic.
Redis caches validated raw forecasts; load-dependent risk is recomputed.
Provider failures use fixed public messages and request IDs, with safe diagnostic
categories logged server-side. Readiness checks database and cache dependencies.

## Current limitations and next milestones

- Checkpoint timing remains distance-proportional, with no modeled driver breaks.
- Truck routing does not yet accept a configurable physical vehicle profile.
- Analyses are not saved or shareable; PostgreSQL deployment is not analysis persistence.
- No departure-window optimizer or printable driver briefing is implemented yet.
- The live overlay does not yet sample a wider corridor grid.
- Provider forecast coverage and rate limits can leave weather unavailable.
- React Native companion and accuracy backtesting remain future work.
