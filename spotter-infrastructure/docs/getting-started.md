# Getting started

This is the one doc a new person needs to get set up and start working on Spotter. It covers setup once, then the two ways to work day-to-day: with Docker (the normal way) or without Docker (a fast path for a quick, isolated change).

Nothing here is duplicated elsewhere — each repo's own README links back to this file instead of repeating it.

## 1. Prerequisites

- **Docker Desktop** — required for the normal (Docker) workflow below. Not required for the no-Docker fast path.
- **Node.js 22+ and Yarn 1.x** (frontend) and **Python 3.12+** (backend) — required either way: for running each repo's quality checks on the host, and for the no-Docker workflow.
- **GitHub access** to the `Spotterv1` org, with access to all three repos.

## 2. Clone all three repos as siblings

They must sit next to each other — the Docker setup depends on this exact layout:

```text
work-space/
├── spotter-frontend/
├── spotter-backend/
└── spotter-infrastructure/
```

## 3. Set up a local domain (Docker workflow only)

Nginx routes based on the `server_name` in `spotter-infrastructure/webserver/conf.d/dev/spotter.conf`. Pick any local domain, point it at `127.0.0.1`, and set `server_name` to match.

**Simplest option** — add one line to `/etc/hosts` (requires `sudo`):

```text
127.0.0.1  your-app.test
```

An optional wildcard-DNS setup (`dnsmasq`) exists for resolving many local domains at once — see `spotter-infrastructure/README.md` if you want it. It's not required.

## 4. Copy environment files

None of the real `.env` files are committed — only `.env.example` templates are. Copy each one and fill in values (defaults are fine to start):

```bash
cp spotter-backend/.env.example spotter-backend/.env
cp spotter-frontend/apps/web/.env.example spotter-frontend/apps/web/.env
cp spotter-infrastructure/.env.example spotter-infrastructure/.env
```

## 5. Start everything and verify

```bash
cd spotter-infrastructure
docker compose -f docker-compose.local.yml up -d --build
```

Open `http://<your-local-domain>/` in a browser, and confirm the API responds:

```bash
curl -H "Host: <your-local-domain>" http://127.0.0.1/api/health
```

Expect `{"status":"ok"}`. Setup is done.

---

## Day-to-day workflow — with Docker (normal)

Use this for regular work. Source changes hot-reload automatically; you don't rebuild for every edit.

| You changed...                     | Do this                                                         |
| ----------------------------------- | ------------------------------------------------------------------ |
| Backend or frontend source code     | Nothing — hot reload picks it up automatically                     |
| Backend dependencies (`requirements.txt`) | `docker compose -f docker-compose.local.yml restart spotter-backend`            |
| A Dockerfile itself                 | `docker compose -f docker-compose.local.yml up -d --build --force-recreate <service>`          |

Useful commands while working (all with `-f docker-compose.local.yml`):

```bash
docker compose -f docker-compose.local.yml ps           # what's running
docker compose -f docker-compose.local.yml logs -f      # tail all logs
docker compose -f docker-compose.local.yml down         # stop everything (never add -v — it deletes your local database)
```

**Before pushing**, in whichever repo you changed:

```bash
yarn quality
```

Runs lint, type-check, format-check, tests, and build. Fix anything it reports, then open a PR into `develop`. GitHub Actions runs the same checks automatically on the PR.

---

## Day-to-day workflow — without Docker (fast path)

Use this when you want to make a quick, isolated change and don't need the full stack (database, Redis, Nginx). Only Node, Yarn and Python are required — no Docker.

**Backend** (one terminal), runs on `http://localhost:8000`:

```bash
cd spotter-backend
python -m venv .venv && source .venv/bin/activate
make install
make dev
```

**Frontend** (another terminal), runs on `http://localhost:5173`, talking to the backend directly:

```bash
cd spotter-frontend/apps/web
corepack enable
yarn install
yarn dev
```

**What you don't get this way:** Postgres (the backend falls back to SQLite), Redis, or Nginx — fine if your change doesn't touch those.

**Before pushing:** same as the Docker workflow — `make quality` (backend) or `yarn quality` (frontend).
