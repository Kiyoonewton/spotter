# Local setup

Spotter is one public monorepo. Clone `develop`; the backend, frontend, infrastructure
and mobile folders are already included. No separate organisation access or sibling
repository checkouts are needed.

## Docker workflow

Requirements: Git, Docker with Compose, and a free local port 80.
From the repository root:

```sh
test -f spotter-backend/.env || cp spotter-backend/.env.example spotter-backend/.env
test -f spotter-infrastructure/.env || cp spotter-infrastructure/.env.example spotter-infrastructure/.env
cd spotter-infrastructure
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml ps
curl -H 'Host: spotter.kiyoo' http://127.0.0.1/api/health
```

Open http://localhost/. Demo needs no provider credentials. The dev Nginx server
name is `spotter.kiyoo`; optionally add `127.0.0.1 spotter.kiyoo` to your hosts file.
The frontend gets `VITE_API_BASE_URL=/api` from Compose. PostgreSQL and Redis use
internal service names; Compose supplies the backend database/cache URLs.

For Live, set `OPENCAGE_API_KEY` and `HERE_API_KEY` in `spotter-backend/.env`, then
recreate the backend. Never expose keys through frontend variables or commit secrets.
Local example passwords are unsuitable for deployed environments.

```sh
docker compose -f docker-compose.local.yml up -d --force-recreate spotter-backend
docker compose -f docker-compose.local.yml logs --tail 80 webserver spotter-backend spotter-frontend
docker compose -f docker-compose.local.yml exec spotter-backend python manage.py check
docker compose -f docker-compose.local.yml exec spotter-backend python manage.py test
```

Source mounts enable development reload. Rebuild the affected service after
Dockerfile/dependency changes. Stop with `docker compose -f docker-compose.local.yml down`;
adding `-v` deletes the local database volumes.

## Without Docker

Use the Node version in the web `.nvmrc`, Yarn 1 and Python 3.12. Backend:

```sh
cd spotter-backend
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
test -f .env || cp .env.example .env
```

Edit `.env`: remove the Docker `DATABASE_URL` for SQLite, and leave `REDIS_URL`
unset for local-memory caching. Keep keys server-side. Then:

```sh
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

In another terminal from the repository root:

```sh
cd spotter-frontend/apps/web
corepack enable
yarn install --frozen-lockfile
test -f .env || cp .env.example .env
```

Set `VITE_API_BASE_URL=/api` in `.env`, then run `yarn dev`. Open
http://127.0.0.1:5173; Vite proxies `/api` to 127.0.0.1:8000 by default.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Port 80 already allocated | Change local webserver host port, and use that port in browser/curl |
| Frontend rejects environment | Ensure `VITE_API_BASE_URL=/api` is set; restart Vite after env changes |
| Database host `postgres` unavailable on host | Use Compose, or remove Docker DATABASE_URL for SQLite |
| Live search/routing unavailable | Check server-side key presence and safe request-ID/category logs |
| Live route incomplete | Use an upcoming departure within forecast coverage; inspect Unknown fields |
| Browser tests cannot start | Install Chromium and check port 5173 availability |

Full-stack E2E configuration lives in this folder; web mocked browser tests live in
`spotter-frontend/apps/web/tests/e2e`. Native setup is in `spotter-mobile/README.md`.
