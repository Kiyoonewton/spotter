"""Bounded, cached raw forecasts for route-owned checkpoint arrival weather."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
import json

from .forecast_cache import read_forecast, write_forecast
from .weather import WeatherProviderError, fetch_forecasts, select_hour

BATCH_SIZE = 50
MAX_WORKERS = 2
MAX_POINTS = 200
CACHE_SECONDS = 300


def arrival_weather(checkpoints):
    if not checkpoints:
        return []
    if len(checkpoints) > MAX_POINTS:
        raise WeatherProviderError("Weather checkpoint budget exceeded.", category="checkpoint_budget")
    day = datetime.now(timezone.utc).date().isoformat()
    unique = {(p.latitude, p.longitude): p for p in checkpoints}
    values, missing, keys = {}, [], {}
    for coordinates, point in unique.items():
        digest = sha256(json.dumps(coordinates).encode()).hexdigest()
        key = f"arrival-hourly-v1:{day}:{digest}"
        keys[coordinates] = key
        cached = read_forecast(key)
        if cached is None:
            missing.append(point)
        else:
            values[coordinates] = cached
    batches = [missing[i:i + BATCH_SIZE] for i in range(0, len(missing), BATCH_SIZE)]
    pending = []
    if batches:
        # At most four 50-point batches, two at a time. No unbounded fan-out/retries.
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            responses = list(pool.map(fetch_forecasts, batches))
        for batch, (payloads, retrieved) in zip(batches, responses):
            if len(payloads) != len(batch):
                raise WeatherProviderError("Unexpected forecast batch shape.", category="batch_shape")
            for point, payload in zip(batch, payloads):
                coordinates = (point.latitude, point.longitude)
                values[coordinates] = (payload, retrieved)
                pending.append((keys[coordinates], (payload, retrieved)))
    # Resolve every original ETA independently; never cache cargo-dependent risk.
    result = []
    for point in checkpoints:
        payload, retrieved = values[(point.latitude, point.longitude)]
        result.append(select_hour(payload, point.arrival_at, retrieved))
    # Do not persist partial results when any response/normalization fails.
    for key, value in pending:
        write_forecast(key, value, CACHE_SECONDS)
    return result
