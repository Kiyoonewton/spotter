# Local development

For setup and the day-to-day workflow (with or without Docker), see [getting-started.md](getting-started.md). This page covers service/port reference details only.

## Services

| Service              | Image                  | Role                                | Host port | Notes                                  |
| --------------------- | ----------------------- | ------------------------------------- | ---------- | ----------------------------------------- |
| `webserver`            | built from `webserver/` | Nginx reverse proxy                   | `80`       | Only service published to the host        |
| `spotter-frontend`   | built from `../spotter-frontend` | React + Vite dev server    | —          | Reached through `webserver`, not directly |
| `spotter-backend`    | built from `../spotter-backend`  | Django REST API            | —          | Reached through `webserver`, not directly |
| `postgres`             | `postgres:16-alpine`    | Database (`spotter`, `spotter_test`) | —       | Not published to the host                 |
| `redis`                | `redis:7-alpine`        | Cache/session/queue substrate (foundation only) | — | Not published to the host                 |

## Domains and routes

Nginx routes based on the `server_name` configured in `webserver/conf.d/dev/spotter.conf` — pick any local domain and point it at `127.0.0.1` (see [getting-started.md](getting-started.md) for how). Once that's set up:

- `http://<your-local-domain>/` → proxied to `spotter-frontend`
- `http://<your-local-domain>/api/*` → proxied to `spotter-backend`
- `http://<your-local-domain>/api/health` → backend health check, returns `{"status":"ok"}`

## Health checks

- `postgres`: `pg_isready -U <user> -d <db>`
- `redis`: `redis-cli ping`

`spotter-backend` has `depends_on: condition: service_healthy` on both, so it won't start until Postgres and Redis are actually ready to accept connections — not just "container started."

## Volumes

- `spotter_postgres_data` — Postgres data directory
- `spotter_redis_data` — Redis data directory

All three are named volumes and persist across `docker compose -f docker-compose.local.yml down` / `up`. Only adding `-v` removes them.
