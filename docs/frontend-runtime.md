# Built frontend runtime

The app uses TanStack Start server rendering. A static copy of `.output/public`
is insufficient: it contains browser assets but cannot execute the server entry.
The Lovable configuration wrapper defaults to a Cloudflare target. This project
explicitly selects Nitro's `node-server` preset for its Docker environment.

The production Dockerfile has three stages:

- `frontend-build`: installs locked dependencies and builds the app.
- `frontend-runtime`: runs `.output/server/index.mjs` as the Node user on port 3000.
- `gateway`: serves built assets and proxies page requests to the Node runtime
  and `/api/` requests to Django.

Development-server and production Compose both include the built frontend
service. Local Compose continues using Vite for editing. Frontend health checks
make a real HTTP request, so an absent listener or SSR failure prevents gateway
startup. Frontend/backend ports are private to the Docker network.

From `spotter-infrastructure`, after configuring the backend environment:

```sh
cp workspace.dockerignore ../.dockerignore
docker compose -f docker-compose.prod.yml up -d --build --wait
```

CI runs this built stack, checks SSR HTML and browser assets, and exercises the
real form-to-Django journey through Nginx with retries disabled. It does not use
Vite as the production server. Provider credentials are not required for the
deterministic demo journey; full live HERE verification remains separate.

Only public `VITE_API_BASE_URL` enters the frontend build. Provider credentials
stay in Django's server environment. HTTPS termination, production secret/host
configuration, backups and rollout/rollback remain deployment prerequisites.
The existing development deployment workflow still syncs only frontend source;
update it to ship backend/infrastructure changes before using it for full-stack
releases. No deployment is performed by this change.
