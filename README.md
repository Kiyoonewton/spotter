# Spotter

React (Vite + TypeScript) frontend, Django REST backend, Postgres, behind Nginx.

| Directory | Contents |
| --- | --- |
| `spotter-frontend/apps/web` | React app (Vite) — `yarn install && yarn dev` |
| `spotter-backend` | Django + DRF API — `make install && make dev` |
| `spotter-infrastructure` | Docker Compose, Nginx, CI, e2e smoke tests |

## Quick start (Docker)

```bash
cp spotter-backend/.env.example spotter-backend/.env
cp spotter-infrastructure/.env.example spotter-infrastructure/.env
cd spotter-infrastructure
docker compose -f docker-compose.local.yml up -d --build
```

The API health check is at `/api/health`. See `spotter-infrastructure/docs/getting-started.md` for details.
