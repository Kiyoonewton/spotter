# Spotter Backend

Django + Django REST Framework API.

## Run without Docker

```bash
python -m venv .venv && source .venv/bin/activate
make install
cp .env.example .env   # uses SQLite if DATABASE_URL is unset
make dev               # http://localhost:8000/api/health
```

## Checks

```bash
make quality   # ruff lint + format check + tests
```

Docker workflow: see `../spotter-infrastructure/README.md`.

## Trip analysis API

`POST /api/trip-analyses/` accepts `origin`, `destination`, offset-aware `departure_at`, IANA `departure_timezone`, non-negative `load_weight_lb`, and `checkpoint_spacing_miles` (10, 25, or 50). The first milestone returns deterministic demo routes A/B/C and is limited to Chicago, IL → Pittsburgh, PA.

Risk boundaries follow the interval interpretation documented in the assessment: missing weather is `Unknown`, known `No Travel` blocks a route, and only complete eligible routes are ranked. Segments use the starting checkpoint forecast as a documented sampling approximation. No live routing or weather provider is used yet.
