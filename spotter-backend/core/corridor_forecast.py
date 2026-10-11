"""Bounded hourly corridor snapshots, independent of arrival-time route ranking."""
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import math

from .forecast_cache import read_forecast, write_forecast
from .analysis import Weather, classify_weather
from .weather import WeatherCheckpoint, fetch_forecasts, select_hour

MAX_POINTS = 200
BATCH_SIZE = 50
CACHE_SECONDS = 300


class ForecastValidationError(ValueError):
    pass


def validate_forecast(data):
    if not isinstance(data, dict):
        raise ForecastValidationError("Use a JSON object.")
    try:
        start = datetime.fromisoformat(data["start_at"].replace("Z", "+00:00"))
        if start.tzinfo is None:
            raise ValueError
        start = start.astimezone(timezone.utc)
    except (KeyError, TypeError, ValueError, AttributeError):
        raise ForecastValidationError("start_at must be an ISO timestamp with an offset.") from None
    load = data.get("load_weight_lb")
    if isinstance(load, bool) or not isinstance(load, (int, float)) or not math.isfinite(load) or load < 0:
        raise ForecastValidationError("load_weight_lb must be a finite non-negative number.")
    points = data.get("points")
    if not isinstance(points, list) or not 1 <= len(points) <= MAX_POINTS:
        raise ForecastValidationError("Provide 1 to 200 corridor points.")
    identities = set()
    validated = []
    for point in points:
        if not isinstance(point, dict):
            raise ForecastValidationError("Each point must be an object.")
        identity = (point.get("route_id"), point.get("id"))
        if any(not isinstance(value, str) or not 1 <= len(value) <= 200 for value in identity):
            raise ForecastValidationError("Point and route IDs must contain 1 to 200 characters.")
        if identity in identities:
            raise ForecastValidationError("Duplicate route-owned point ID.")
        identities.add(identity)
        coordinates = point.get("coordinates")
        if not isinstance(coordinates, dict):
            raise ForecastValidationError("Each point requires coordinates.")
        lat, lon = coordinates.get("lat"), coordinates.get("lon")
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in (lat, lon)):
            raise ForecastValidationError("Coordinates must be finite numbers.")
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ForecastValidationError("Coordinates are outside valid bounds.")
        validated.append({"id": identity[1], "route_id": identity[0], "coordinates": {"lat": lat, "lon": lon}})
    return start, load, validated


def _payloads(points, start):
    coordinates = list(dict.fromkeys((p["coordinates"]["lat"], p["coordinates"]["lon"]) for p in points))
    results, retrieved, pending_cache = {}, [], []
    for offset in range(0, len(coordinates), BATCH_SIZE):
        batch = coordinates[offset:offset + BATCH_SIZE]
        digest = sha256(json.dumps(batch, separators=(",", ":")).encode()).hexdigest()
        key = "corridor-hourly-v1:" + digest
        result = read_forecast(key)
        if result is None:
            result = fetch_forecasts([WeatherCheckpoint(lat, lon, start) for lat, lon in batch])
            pending_cache.append((key, result))
        payloads, timestamp = result
        retrieved.append(timestamp)
        results.update(zip(batch, payloads))
    return results, min(retrieved), pending_cache


def corridor_forecast(data):
    start, load, points = validate_forecast(data)
    payloads, retrieved, pending_cache = _payloads(points, start)
    frames = []
    for hour in range(49):
        instant = start + timedelta(hours=hour)
        samples = []
        for point in points:
            coordinates = point["coordinates"]
            normalized = select_hour(payloads[(coordinates["lat"], coordinates["lon"])], instant, retrieved)
            weather = None if normalized is None else asdict(normalized)
            values = Weather(None, None, None) if normalized is None else Weather(normalized.wind_mph, normalized.rain_in_hr, normalized.snow_in_hr)
            risk, reasons = classify_weather(values, load)
            risks = {condition: "Unknown" for condition in ("wind", "rain", "snow")}
            risks.update({reason["condition"]: reason["severity"] for reason in reasons})
            samples.append({"id": point["id"], "route_id": point["route_id"], "weather": weather, "risk": risk, "risks": risks})
        frames.append({"hour": hour, "valid_at": instant.isoformat().replace("+00:00", "Z"), "samples": samples})
    for key, result in pending_cache:
        write_forecast(key, result, CACHE_SECONDS)
    return {
        "data_source": "live", "provider": "open-meteo",
        "retrieved_at": retrieved, "start_at": start.isoformat().replace("+00:00", "Z"),
        "cache_ttl_seconds": CACHE_SECONDS,
        "units": {"wind": "mph", "rain": "in/hr", "snow": "in/hr"},
        "points": points, "frames": frames,
        "notice": "Sampled hourly forecast; not radar or a continuous weather field. Arrival-time ranking is unchanged.",
    }
