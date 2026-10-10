# Infrastructure end-to-end tests

Full-stack smoke tests that verify the interaction between the frontend, backend, and Nginx — they live here rather than in `spotter-frontend` because they exercise more than one repository at once.

## Running

These tests target an **already-running** Docker Compose stack through Nginx. They never start Vite, Express, or any other service themselves.

```bash
docker compose up -d --build   # if the stack isn't already running
E2E_BASE_URL=http://<your-local-domain> yarn test:e2e
```

`E2E_BASE_URL` is required — the config throws immediately if it's not set. Use whatever domain you've configured to resolve to `127.0.0.1` for this stack (see the root README's "Local DNS setup").

## Current coverage

- **UI loads through Nginx** — `/` renders the React app's heading.
- **API is reachable through Nginx** — `/api/health` returns `200`, `{"status":"ok"}`, and an `X-Request-ID` header.

## Deferred

- **Authentication flow: pending implementation of the auth domain.** No auth feature exists yet (`spotter-backend/src/domains/auth/` is an empty placeholder), so there is nothing to test — this is not an oversight. Add a real browser journey here once the auth domain is built.
- Every migrated feature/domain should add its own relevant browser journey to this suite once it exists — not before.
