# Spotter backend

Django REST Framework APIs for weather-aware truck routing. Start with the
[root README](../README.md) or [local setup](../spotter-infrastructure/docs/getting-started.md).

## API surface

All paths are under `/api`:

| Method and path | Responsibility |
| --- | --- |
| `GET /health` | Process liveness |
| `GET /ready` | Bounded database/cache readiness |
| `GET /locations/?q=Chicago&mode=live` | Validated Demo/Live location search |
| `POST /trip-analyses/` | Route, arrival weather, risk, coverage, ranking and optional snapshot |
| `POST /corridor-forecasts/` | Hourly sampled forecast preview |
| `POST /saved-analyses/restore/` | Restore original server snapshot using a body token |
| `POST /departure-comparisons/` | Fresh weather across four departure windows on saved routes |

Trip analysis takes `mode`, origin/destination labels, offset-aware `departure_at`,
IANA `departure_timezone`, non-negative `load_weight_lb`, and
`checkpoint_spacing_miles` (10, 25 or 50). Live additionally requires coordinates;
see validation in [core/views.py](core/views.py). Demo is limited to deterministic
Chicago → Pittsburgh alternatives. Live uses OpenCage, HERE truck routes and
Open-Meteo; failure never returns Demo data.

## Logic and data handling

Checkpoints and bent segment paths belong to their route. Provider normalization
precedes risk classification; missing measurements stay Unknown. Cargo-based wind
overrides and known No Travel conditions are deterministic rules. Only complete,
unblocked routes are ranked. Segments use their starting checkpoint's classified
risk as a documented sampling approximation.

HERE span timing has an explicit distance-proportional fallback. Redis caches raw
validated weather; risk is recalculated for cargo. Saved analyses use PostgreSQL,
hashed bearer tokens and seven-day expiry. Failures expose fixed public messages,
error codes and request IDs, with safe diagnostic categories logged server-side.

## Verify with the local Docker stack

From `spotter-infrastructure` after starting Compose:

```sh
docker compose -f docker-compose.local.yml exec spotter-backend python manage.py check
docker compose -f docker-compose.local.yml exec spotter-backend python manage.py test
```

For a host virtual environment, follow [local setup](../spotter-infrastructure/docs/getting-started.md).
Remove Docker-only database/cache URLs when using SQLite/local memory on the host.
Provider fixtures do not require real keys; live provider checks are separate.

## Policies

- [Provider fields, units and missing data](../docs/providers.md)
- [Checkpoint timing](../docs/route-timing.md)
- [Truck profile and critical notices](../docs/truck-profile.md)
- [Forecast cache/readiness](../docs/corridor-forecast.md)
- [Saved snapshots](../docs/saved-analyses.md)
- [Departure comparison](../docs/departure-comparison.md)
