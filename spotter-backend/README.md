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
