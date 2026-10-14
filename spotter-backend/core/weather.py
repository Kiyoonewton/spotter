"""Open-Meteo hourly forecast adapter for checkpoint arrival weather."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http.client import HTTPException
import json
import math
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class WeatherProviderError(Exception):
    SAFE_CATEGORIES = {"rate_limited", "timeout", "network", "http_4xx", "http_5xx",
                       "malformed_json", "batch_shape", "checkpoint_budget", "invalid_data"}

    def __init__(self, message, *, category="invalid_data"):
        super().__init__(message)
        self.category = category if category in self.SAFE_CATEGORIES else "invalid_data"


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
    interval_start: str
    interval_end: str
    interval_minutes: int
    provider: str
    retrieved_at: str
    wind_valid_at: str = ""


def _utc(value: datetime | str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        raise ValueError("Weather timestamps must include a timezone offset.")
    return parsed.astimezone(timezone.utc)


def _forecast_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def select_hour(payload: dict, arrival_at: datetime | str, retrieved_at: str = "") -> NormalizedWeather | None:
    try:
        hourly = payload["hourly"]
        times = hourly["time"]
        arrival = _utc(arrival_at)
        parsed_times = [_forecast_utc(item) for item in times]
        if any(end <= start for start, end in zip(parsed_times, parsed_times[1:])):
            raise WeatherProviderError("Open-Meteo returned unordered hourly timestamps.")
        precip_index = next((i for i, timestamp in enumerate(parsed_times) if timestamp > arrival), None)
        if precip_index is None or precip_index == 0:
            return None
        if not parsed_times[precip_index] - timedelta(hours=1) <= arrival < parsed_times[precip_index]:
            return None
        units = payload.get("hourly_units", {})
        if units and (units.get("rain") not in {"mm", "mm (millimetre)", "mm (millimeters)"} or units.get("showers") not in {"mm", "mm (millimetre)", "mm (millimeters)"} or units.get("snowfall") not in {"cm", "cm (centimeters)"} or units.get("wind_speed_10m") not in {"km/h", "km/h (kilometres per hour)"}):
            raise WeatherProviderError("Open-Meteo returned unexpected weather units.")
        wind_index = min(range(len(parsed_times)), key=lambda i: abs((parsed_times[i] - arrival).total_seconds()))
        if abs((parsed_times[wind_index] - arrival).total_seconds()) > 3600:
            return None
        def convert(raw, factor):
            if raw is None:
                return None
            if isinstance(raw, bool) or not math.isfinite(float(raw)) or float(raw) < 0:
                raise WeatherProviderError("Open-Meteo returned an invalid measurement.")
            return float(raw) * factor
        if hourly.get("wind_speed_10m", [None] * len(times))[wind_index] is None:
            wind = None
        else:
            wind = convert(hourly["wind_speed_10m"][wind_index], 0.621371192)
        def value(name, factor):
            raw = hourly.get(name, [None] * len(times))[precip_index]
            return convert(raw, factor)
        rain, showers = value("rain", 0.0393700787), value("showers", 0.0393700787)
        liquid = None if rain is None or showers is None else rain + showers
        start, end = parsed_times[precip_index] - timedelta(hours=1), parsed_times[precip_index]
        return NormalizedWeather(
            wind, liquid, value("snowfall", 0.393700787),
            end.isoformat().replace("+00:00", "Z"), start.isoformat().replace("+00:00", "Z"),
            end.isoformat().replace("+00:00", "Z"), 60, "open-meteo", retrieved_at,
            parsed_times[wind_index].isoformat().replace("+00:00", "Z"),
        )
    except (KeyError, TypeError, ValueError, IndexError) as error:
        raise WeatherProviderError("Open-Meteo returned malformed hourly data.") from error


def fetch_forecasts(checkpoints: list[WeatherCheckpoint]) -> tuple[list[dict], str]:
    if not checkpoints:
        return [], ""
    latitudes = ",".join(str(point.latitude) for point in checkpoints)
    longitudes = ",".join(str(point.longitude) for point in checkpoints)
    params = urlencode({"latitude": latitudes, "longitude": longitudes, "hourly": "wind_speed_10m,rain,showers,snowfall", "forecast_days": 7, "timezone": "UTC", "wind_speed_unit": "kmh", "precipitation_unit": "mm", "snowfall_unit": "cm"})
    try:
        with urlopen(Request(f"https://api.open-meteo.com/v1/forecast?{params}", headers={"User-Agent": "spotter/1.0"}), timeout=8) as response:
            payload = json.load(response)
    except HTTPError as error:
        if error.code == 429:
            raise WeatherProviderError("Open-Meteo rate limit exceeded; retry later.", category="rate_limited") from error
        raise WeatherProviderError("Open-Meteo weather request failed.", category="http_5xx" if error.code >= 500 else "http_4xx") from error
    except TimeoutError as error:
        raise WeatherProviderError("Weather request timed out.", category="timeout") from error
    except URLError as error:
        category = "timeout" if isinstance(error.reason, TimeoutError) else "network"
        raise WeatherProviderError("Weather network request failed.", category=category) from error
    except (OSError, HTTPException) as error:
        raise WeatherProviderError("Weather connection failed.", category="network") from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise WeatherProviderError("Invalid weather JSON.", category="malformed_json") from error
    retrieved = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payloads = payload if isinstance(payload, list) else [payload]
    if len(payloads) != len(checkpoints):
        raise WeatherProviderError("Open-Meteo returned an unexpected batch shape.", category="batch_shape")
    return payloads, retrieved


def fetch_hourly(checkpoints: list[WeatherCheckpoint]) -> list[NormalizedWeather | None]:
    from .arrival_weather import arrival_weather
    return arrival_weather(checkpoints)
