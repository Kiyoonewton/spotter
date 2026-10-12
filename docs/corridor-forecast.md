# Corridor forecast snapshots

POST /api/corridor-forecasts/ accepts an offset-aware start_at, load_weight_lb,
and 1 to 200 points with id, route_id, and coordinates {lat, lon}.
Optional `horizon_hours` is an integer from 1 to 720 (default 48 for older clients).
It returns `horizon_hours + 1` hourly frames, including departure and the final hour.
The UI requests the longest returned route duration rounded up to an hour, across
all alternatives, independent of route selection. For example, 8h42m requests
9 hours and 10 frames. The 720-hour API budget prevents unbounded response work;
out-of-budget requests fail validation rather than silently shortening a journey.
This window does not extend provider coverage: unavailable future weather remains
Unknown, with no extrapolation or clamping.

Coordinates are deduplicated across routes, while point ownership is preserved.
Provider batches contain at most 50 coordinates. Raw hourly responses are cached
for five minutes through Django's cache backend; risk is recomputed for the
requested load. The default cache is process-local, not a claim of Redis deployment.
Setting REDIS_URL selects the shared Redis backend; leaving it unset uses local memory.

Open-Meteo wind is instantaneous and uses the nearest scheduled sample, earlier
on ties. Missing nearest wind stays missing. Rain is rain + showers only when
both are present. Rain and snowfall are preceding-hour accumulations converted
to average hourly rates in inches/hour. An exact-hour snapshot at T uses the precipitation
interval [T, T+1h); other snapshots use the containing hourly interval.
The accumulation interval is labelled separately from wind_valid_at. No out-of-horizon
clamping or extrapolation occurs; missing measurements remain null.

The live map shows sampled checkpoint circles, not radar or a continuous weather
field. Variable controls select wind, rain, or snow; dashed outlines indicate
missing values. Circles use the selected variable's risk category for the applied
load. Route lines and checkpoint inspection retain arrival-time risk.
Changing hours, variable, opacity, or the manual time selection cannot mutate ranking,
recommendation, or checkpoint arrival weather.

Times use the applied origin IANA timezone. Provider retrieval time and cache
policy are visible. Forecast request failures leave trip results usable and offer
retry. Requests abort and stale responses are ignored after input changes or unmount.
Forecast start/load are the successfully applied trip values, not unsubmitted edits.

Open-Meteo reference: https://open-meteo.com/en/docs
The public endpoint's usage terms should be reviewed for production deployment.
Live end-to-end HERE verification still requires configured routing credentials.

## Shared cache and readiness

Set server-only `REDIS_URL=redis://redis:6379/0` to share the five-minute
validated provider payload cache across Django workers. Without it, local
memory remains available for standalone development. Redis is already present
in the local Compose stack; do not publish its port on the deployment server.
Configure eviction (for example `maxmemory 128mb` and `allkeys-lru`) so cache
storage remains bounded. This cache is disposable, not a source of truth.

Redis socket/connect timeouts are one second. A cache connection outage logs
only operation and exception category, then fetches fresh provider data.
Provider failures retain the existing safe 503 response, with no demo fallback.
Malformed provider payloads are not cached. Load-dependent classification is
recomputed, rather than reusing another truck's recommendation.

`GET /api/health` is process liveness. `GET /api/ready` checks database access
and cache write/read/delete, returning dependency states and a request ID.
It returns 503 when either dependency is unavailable, with no connection
strings, exception messages or credentials in responses/logs. Readiness failure
must not trigger automatic container restarts during a Redis outage, because
fresh forecast requests can still succeed.

CI starts real Redis and verifies that a separate Python process reads the
same cache entry and that its expiry is bounded. Unit tests verify outage
behavior and safe readiness failures. This does not establish server deployment
or full live HERE verification. Production frontend serving and HTTPS remain
separate deployment work; the current static production image has not been
verified as a complete TanStack Start runtime.
