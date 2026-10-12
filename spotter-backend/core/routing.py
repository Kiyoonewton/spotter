"""HERE Routing API v8 adapter and provider-neutral route structures."""
from __future__ import annotations

from dataclasses import dataclass
import json
import math
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


from .route_timing import build_span_timing


class RoutingProviderError(Exception):
    pass


@dataclass(frozen=True)
class RouteRequest:
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float
    departure_at: str


@dataclass(frozen=True)
class NormalizedRoute:
    provider_id: str
    coordinates: list[tuple[float, float]]
    distance_meters: float
    duration_seconds: int
    sections: list[dict]
    timing_profile: list[tuple[float, float]] | None = None


def _decode_flexible_polyline(encoded: str) -> list[tuple[float, float]]:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    values = {char: index for index, char in enumerate(alphabet)}
    index = 0

    def varint() -> int:
        nonlocal index
        result, shift = 0, 0
        while index < len(encoded):
            value = values.get(encoded[index])
            index += 1
            if value is None:
                raise RoutingProviderError("HERE returned invalid flexible polyline encoding.")
            result |= (value & 0x1F) << shift
            if value < 0x20:
                return result
            shift += 5
            if shift > 60:
                raise RoutingProviderError("HERE returned an overlong flexible polyline.")
        raise RoutingProviderError("HERE returned truncated flexible polyline data.")

    version = varint()
    header = varint()
    precision, third_dim = header & 15, (header >> 4) & 7
    if version != 1:
        raise RoutingProviderError("HERE returned an unsupported flexible polyline version.")
    if third_dim:
        raise RoutingProviderError("Three-dimensional HERE geometry is unsupported.")
    factor = 10 ** precision
    lat = lon = 0
    points: list[tuple[float, float]] = []
    while index < len(encoded):
        lat_delta, lon_delta = varint(), varint()
        lat += -(lat_delta >> 1) - 1 if lat_delta & 1 else lat_delta >> 1
        lon += -(lon_delta >> 1) - 1 if lon_delta & 1 else lon_delta >> 1
        point = (lat / factor, lon / factor)
        if not -90 <= point[0] <= 90 or not -180 <= point[1] <= 180:
            raise RoutingProviderError("HERE returned coordinates outside valid bounds.")
        points.append(point)
    if len(points) < 2:
        raise RoutingProviderError("HERE returned insufficient route geometry.")
    return points


def normalize_routes(payload: dict) -> list[NormalizedRoute]:
    routes = payload.get("routes") if isinstance(payload, dict) else None
    if not isinstance(routes, list):
        raise RoutingProviderError("HERE returned malformed routes.")
    normalized: list[NormalizedRoute] = []
    seen_shapes: set[tuple[tuple[float, float], ...]] = set()
    for route in routes[:3]:
        try:
            sections = route["sections"]
            if not isinstance(sections, list) or not sections:
                raise ValueError
            shapes = [_decode_flexible_polyline(section["polyline"]) for section in sections]
            coordinates = [point for shape in shapes for point in shape]
            shape = tuple(coordinates)
            if shape in seen_shapes:
                continue
            seen_shapes.add(shape)
            summaries = [section["summary"] for section in sections]
            for summary in summaries:
                for field in ("length", "duration"):
                    value = summary[field]
                    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
                        raise ValueError
                if not float(summary["duration"]).is_integer():
                    raise ValueError
            distance = sum(float(summary["length"]) for summary in summaries)
            duration = sum(int(summary["duration"]) for summary in summaries)
            if distance <= 0 or duration <= 0:
                raise ValueError
            normalized.append(NormalizedRoute(str(route["id"]), coordinates, distance, duration, sections, build_span_timing(sections, shapes)))
        except (KeyError, TypeError, ValueError):
            raise RoutingProviderError("HERE returned malformed route geometry or timing.")
    if not normalized:
        raise RoutingProviderError("HERE returned no usable routes.")
    return normalized


def calculate_routes(request_data: RouteRequest) -> list[NormalizedRoute]:
    key = os.getenv("HERE_API_KEY")
    if not key:
        raise RoutingProviderError("Live routing requires HERE_API_KEY.")
    params = urlencode({
        "apiKey": key, "transportMode": "truck", "routingMode": "fast",
        "origin": f"{request_data.origin_lat},{request_data.origin_lon}",
        "destination": f"{request_data.destination_lat},{request_data.destination_lon}",
        "departureTime": request_data.departure_at, "alternatives": 2,
        "return": "polyline,summary,travelSummary",
        "spans": "duration,length,dynamicSpeedInfo",
        "units": "imperial",
    })
    try:
        with urlopen(Request(f"https://router.hereapi.com/v8/routes?{params}"), timeout=8) as response:
            return normalize_routes(json.load(response))
    except HTTPError as error:
        if error.code in {401, 403}:
            raise RoutingProviderError("HERE authentication or permission failed.") from error
        if error.code == 429:
            raise RoutingProviderError("HERE rate limit exceeded; retry later.") from error
        raise RoutingProviderError("HERE routing request failed.") from error
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise RoutingProviderError("HERE routing request timed out or returned invalid data.") from error
