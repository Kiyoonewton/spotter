# Development deployment

Development runs the built React/TanStack Node frontend, Django/Gunicorn,
Nginx, Postgres and Redis through `docker-compose.development.yml`.
Only Nginx publishes port 80. HTTPS termination must be configured separately.
This workflow does not provision or deploy staging/production.

## Server setup

Keep the three service directories under one workspace (default
`/root/kiyoo/spotter-new`). Install Docker Compose v2 and rsync. The SSH user
must own the workspace and be permitted to run Docker. Configure the real
`spotter-infrastructure/.env.development` on the server; it is never synced
from CI. Use `.env.development.example` as a template, with real secrets.

Set `PUBLIC_HOST` to the development hostname, include it in
`DJANGO_ALLOWED_HOSTS`, and set the matching `CORS_ORIGIN`. `DATABASE_URL`
must use the same password as `POSTGRES_PASSWORD`, and Redis should point
to the private `redis` service. Provider credentials remain server-only.

In the GitHub `development` environment configure:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | DEV_HOST | Server DNS name or IPv4 address |
| Variable | DEV_USER | SSH user; defaults to root for existing setup |
| Variable | DEV_PATH | Absolute workspace; defaults to /root/kiyoo/spotter-new |
| Secret | DEV_SSH_PRIVATE_KEY | Deployment SSH key |
| Secret | DEV_SSH_KNOWN_HOSTS | Pinned OpenSSH known_hosts entry for DEV_HOST |

Verify the host-key fingerprint through your server console or another trusted
channel before saving the known_hosts entry. The workflow never trusts a fresh
unauthenticated ssh-keyscan result. Environment protection rules can require
approval; configure those in GitHub as appropriate.

## Rollout behavior

Pushes to develop retain automatic deployment; workflow_dispatch is also
available on develop. The gate waits for all eight required checks on the exact
commit, including both CodeQL analyses, Docker runtime tests and browser tests.
The PR-only CodeQL aggregate is checked when present but is not required on
branch pushes. The gate also reads published CodeQL analyses for both languages
at the exact SHA/ref and requires zero open CodeQL alerts on develop. Failed API
access or stale/missing security results cannot authorize deployment.
It refuses failed/missing/neutral checks and rejects a stale rollout if develop
advanced while waiting for environment approval. In-progress rollouts are not
cancelled by later pushes, so migrations are not interrupted.

Rsync updates frontend, backend and infrastructure together. Server .env files,
SQLite/runtime files and installed dependencies are protected from deletion;
placeholder examples are updated. Backups live outside those service directories.
The script copies the workspace Docker allowlist and builds all three application
images before changing running services.

For an existing running Postgres service, pg_dump must produce a non-empty,
mode-0600 server backup before restart. A failed build or backup stops deployment.
The script retains the existing Compose project and volumes, starts with
--wait, runs Django checks, and verifies database/cache readiness and the page
through Nginx. It derives the HTTP host from server configuration, not a hardcoded
host port. A failed readiness check fails the workflow.

First install has no existing database to back up. CI tests both first install
and a repeat rollout, then restores the backup into a disposable Postgres
database and verifies migration history. Live SSH/server deployment is separate
from these temporary CI-stack tests.

## Recovery and limits

This is an in-place Compose rollout and may have brief downtime. Database
migrations run during backend startup. There is no automatic rollback after a
migration: restoring a database can discard subsequent writes and requires an
explicit operational decision. Never run down --volumes on the server.

For recovery, select a previously verified revision, sync its complete service
sources while preserving the server env, and rebuild compatible images. Review
migration compatibility before starting the older backend. Restore a backup
only when necessary and after preserving current data. Keep backups protected,
copy them off-server and define retention; this workflow does not delete them.
Production secret/host hardening, TLS, monitoring, staging and full live HERE
verification remain outstanding. No real server deployment is established by
this documentation or by mocked SSH-free tests.
