"""Open-Meteo hourly forecast adapter for checkpoint arrival weather."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class WeatherProviderError(Exception):
    pass


@dataclass(frozen=True)
class WeatherCheckpoint:
    latitude: float
    longitude: float
    arrival_at: datetime


@dataclass(frozen=True)
class NormalizedWeather:
    wind_mph: float | None
    rain_in_hr: float | None
    snow_in_hr: float | None
    forecast_valid_at: str
    interval_minutes: int
    provider: str
    retrieved_at: str


def _utc(value: datetime | str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        raise ValueError("Weather timestamps must include a timezone offset.")
    return parsed.astimezone(timezone.utc)


def select_hour(payload: dict, arrival_at: datetime | str, retrieved_at: str = "") -> NormalizedWeather | None:
    try:
        hourly = payload["hourly"]
        times = hourly["time"]
        arrival = _utc(arrival_at)
        parsed_times = [_utc(item) for item in times]
        index = next((i for i, start in enumerate(parsed_times) if start <= arrival < start + timedelta(hours=1)), None)
        if index is None:
            return None
        def value(name, factor):
            raw = hourly.get(name, [None] * len(times))[index]
            return None if raw is None else float(raw) * factor
        return NormalizedWeather(
            value("wind_speed_10m", 0.621371192),
            value("rain", 0.0393700787),
            value("snowfall", 0.393700787),
            parsed_times[index].isoformat().replace("+00:00", "Z"), 60, "open-meteo", retrieved_at,
        )
    except (KeyError, TypeError, ValueError, IndexError) as error:
        raise WeatherProviderError("Open-Meteo returned malformed hourly data.") from error


def fetch_hourly(checkpoints: list[WeatherCheckpoint]) -> list[NormalizedWeather | None]:
    if not checkpoints:
        return []
    latitudes = ",".join(str(point.latitude) for point in checkpoints)
    longitudes = ",".join(str(point.longitude) for point in checkpoints)
    params = urlencode({"latitude": latitudes, "longitude": longitudes, "hourly": "wind_speed_10m,rain,snowfall", "forecast_days": 7, "timezone": "UTC"})
    try:
        with urlopen(Request(f"https://api.open-meteo.com/v1/forecast?{params}", headers={"User-Agent": "spotter/1.0"}), timeout=8) as response:
            payload = json.load(response)
    except HTTPError as error:
        if error.code == 429:
            raise WeatherProviderError("Open-Meteo rate limit exceeded; retry later.") from error
        raise WeatherProviderError("Open-Meteo weather request failed.") from error
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise WeatherProviderError("Open-Meteo weather request timed out or returned invalid data.") from error
    retrieved = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payloads = payload if isinstance(payload, list) else [payload]
    if len(payloads) != len(checkpoints):
        raise WeatherProviderError("Open-Meteo returned an unexpected batch shape.")
    return [select_hour(item, checkpoint.arrival_at, retrieved) for item, checkpoint in zip(payloads, checkpoints)]
