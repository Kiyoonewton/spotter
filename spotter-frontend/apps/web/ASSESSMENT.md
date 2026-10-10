# Dispatch workspace prototype

This frontend uses TanStack Start, React, Material UI, and Tailwind CSS.
The dispatch screen compares three illustrative Chicago-to-Pittsburgh corridors,
with route ranking, checkpoint weather, map selection, forecast controls, and
loading, missing-forecast, and blocked-route demo states.

## Run locally

Use the Node version in `.nvmrc` and Yarn 1:

```sh
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:5173`. The dispatch screen needs no backend credentials.

## Request lifecycle

The Lovable Vite wrapper enables TanStack Start and selects `src/server.ts` as
the custom server entry. Start discovers `src/start.ts` for request error and
CSRF middleware. `src/router.tsx` creates a router and query client per request;
`src/routes/__root.tsx` renders the HTML shell and providers.
Start supplies the client hydration entry. The legacy `index.html`, `main.tsx`,
and `App.tsx` are not the Start hydration entry.

## Temporary data

`src/lib/dispatch-data.ts` supplies local fixtures and ranking calculations.
There is no live weather, routing, geocoding, or backend integration yet.
The form intentionally supports only Chicago, IL to Pittsburgh, PA.
The backend can later replace the fixture reads with API calls; `server.ts`
currently hosts the frontend SSR lifecycle, not the future Spotter API.

## Checks

```sh
yarn typecheck
yarn lint
yarn format:check
yarn test
yarn test:e2e
yarn build
```

Playwright requires its Chromium browser (`yarn playwright install chromium`).
Build output and dependency folders are excluded from version control.
