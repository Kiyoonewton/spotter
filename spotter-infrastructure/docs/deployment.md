# Deployment plan

## Environments

```text
Local  →  Development  →  Staging  →  Production
```

- **Local** — your own machine, hot reload, bind-mounted source. `docker-compose.local.yml`. See the root README and [getting-started.md](getting-started.md).
- **Development** — a remote server running production-style builds (no hot reload, no bind mounts) with its own Postgres and Redis. `docker-compose.development.yml`, domain `dev.spotter.com`. See "Development environment" below.
- **Staging** — a pre-production environment for validating changes before they reach real users, on the same server as Development, with its own compose file and containers (not yet created — will follow the same pattern as Development once needed). Configuration and secrets are separate from Development's.
- **Production** — the live environment. Not yet provisioned. Database backup/restore procedures are documented separately in `../spotter-backend/docs/database-operations.md` (daily backups, 30-day retention, pre-migration backups, restore drills) and apply once production exists.

## Development environment

Runs on a remote server, reachable at `http://dev.spotter.com` (HTTP only for now — see "Deferred" below).

**Compose file:** `docker-compose.development.yml`. Services: `webserver` (built from `webserver/Dockerfile.prod`, frontend baked in as a production build), `spotter-backend` (built from `spotter-backend/Dockerfile`, production build), `postgres` (16), `redis` (7). No `container_name` on any service — Staging will run on the same server later and fixed names would collide. Only `webserver` publishes a host port; Postgres, Redis, and the backend are private Docker-network services only.

### Starting Development

```bash
# From the workspace root on the server, with spotter-frontend,
# spotter-backend, and spotter-infrastructure checked out as siblings:
cd spotter-infrastructure

# 1. Copy the dockerignore into place for the wide build context
cp workspace.dockerignore ../.dockerignore

# 2. Create the real env file from its example and fill in real values
cp .env.development.example .env.development

# 3. Validate the compose file
docker compose -f docker-compose.development.yml --env-file .env.development config --quiet

# 4. Start the stack
docker compose -f docker-compose.development.yml --env-file .env.development up -d --build

# 5. Verify
curl -H "Host: dev.spotter.com" http://127.0.0.1/api/health
```

Expect `{"status":"ok"}`.

### Environment file

`.env.development` is gitignored — only `.env.development.example` is committed, with placeholders. It must set:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — for the Postgres container.
- `DATABASE_URL` — for the backend, using the **same** `POSTGRES_PASSWORD` value as above (see the example file's comment for the exact format). These must match, or the backend can't authenticate against its own database.
- `CORS_ORIGIN` — `http://dev.spotter.com`.

Generate a real password (not the placeholder) before deploying, e.g. `openssl rand -base64 32`, and use the same value in both places.

## What's already in place

- `docker-compose.prod.yml` — builds a single production-style Nginx image (compiled frontend served as static files, `/api/` proxied to the backend) and a production backend image, without its own Postgres/Redis (assumes managed/external database services). This is the artifact production deployment will eventually run — not yet an actual deployment pipeline.
- `docker-compose.development.yml` — the same production-style webserver/backend build, plus its own Postgres and Redis, for a real (if early) server environment.
- The backend's own production Dockerfile is multi-stage (compile, install production-only dependencies, non-root runtime user).
- The webserver image build needs a `.dockerignore` at the workspace root (see [`workspace.dockerignore`](../workspace.dockerignore) and the README's "Building a production-style webserver image" section). Any pipeline building this image must copy that file into place (`cp workspace.dockerignore ../.dockerignore`) before running the build — otherwise the build context is the entire, unrelated workspace root, and `spotter-backend/.env` could be sent to Docker.

## Deferred

- **HTTPS.** Development currently runs over plain HTTP. Cloudflare DNS and HTTPS are the next step once the stack is confirmed working over HTTP — not part of this setup.
- Staging's own compose file and server config (will mirror Development).
- Where Production actually runs (hosting provider / orchestration).
- Secrets management for a real environment (how `DATABASE_URL`, `POSTGRES_PASSWORD`, etc. reach the server safely in an ongoing way — right now it's a manually-created `.env.development` on the server, which is fine for an early single-developer setup but not a long-term secrets story).
- CI/CD: what triggers a Development/Staging deploy, what gates a Production deploy.
- Production domain and TLS.
- Monitoring, alerting, and on-call ownership.

This section will be replaced with concrete steps as each is decided — this file exists so the plan is agreed in shape before infrastructure is built, not invented retroactively.
