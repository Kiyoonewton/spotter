"""Route-owned checkpoint and segment sampling from normalized provider routes."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from .route_geometry import geodesic_distance as _distance
from .route_timing import elapsed_at_fraction
from .routing import NormalizedRoute, RoutingProviderError

MILES_PER_METER = 0.000621371192
SPACING = {10, 25, 50}


@dataclass(frozen=True)
class SampledCheckpoint:
    id: str
    route_id: str
    distance_miles: float
    coordinates: tuple[float, float]
    elapsed_seconds: int
    arrival_at: str
    timing_method: str


@dataclass(frozen=True)
class SampledSegment:
    id: str
    route_id: str
    start_checkpoint_id: str
    end_checkpoint_id: str
    distance_miles: float
    coordinates: tuple[tuple[float, float], ...]



def _geometry(route: NormalizedRoute) -> tuple[list[tuple[float, float]], list[float], float]:
    points: list[tuple[float, float]] = []
    for point in route.coordinates:
        if not -90 <= point[0] <= 90 or not -180 <= point[1] <= 180:
            raise RoutingProviderError("Route geometry contains invalid coordinates.")
        if not points or point != points[-1]:
            points.append(point)
    if len(points) < 2:
        raise RoutingProviderError("Route geometry needs at least two distinct coordinates.")
    cumulative = [0.0]
    for start, end in zip(points, points[1:]):
        cumulative.append(cumulative[-1] + _distance(start, end))
    return points, cumulative, cumulative[-1]


def _point_at(points, cumulative, target):
    for index in range(1, len(cumulative)):
        if cumulative[index] >= target:
            section = cumulative[index] - cumulative[index - 1]
            ratio = 0 if section == 0 else (target - cumulative[index - 1]) / section
            start, end = points[index - 1], points[index]
            return (start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio)
    return points[-1]


def _path_between(points, cumulative, start, end):
    path = [_point_at(points, cumulative, start)]
    path.extend(point for point, distance in zip(points[1:-1], cumulative[1:-1]) if start < distance < end)
    path.append(_point_at(points, cumulative, end))
    return tuple(path)


def _geometry_distance_for_provider_miles(miles, provider_miles, geometry_meters):
    if provider_miles <= 0:
        return 0.0
    return geometry_meters * (miles / provider_miles)


def sample_route(route: NormalizedRoute, spacing_miles: int, departure_at: str) -> tuple[list[SampledCheckpoint], list[SampledSegment], dict]:
    if spacing_miles not in SPACING:
        raise ValueError("Checkpoint spacing must be 10, 25, or 50 miles.")
    try:
        departure = datetime.fromisoformat(departure_at)
    except ValueError as error:
        raise ValueError("Departure must be ISO 8601.") from error
    if departure.tzinfo is None:
        raise ValueError("Departure must include a timezone offset.")
    departure = departure.astimezone(timezone.utc)
    points, cumulative, geometry_meters = _geometry(route)
    provider_miles = route.distance_meters * MILES_PER_METER
    distances = []
    current = 0.0
    while current < provider_miles:
        distances.append(current)
        current += spacing_miles
    if not distances or abs(distances[-1] - provider_miles) > 1e-9:
        distances.append(provider_miles)
    timing_method = "here_span_interpolation" if route.timing_profile else "distance_proportional_estimate"
    checkpoints: list[SampledCheckpoint] = []
    for index, miles in enumerate(distances):
        ratio = 0 if provider_miles == 0 else miles / provider_miles
        elapsed = round(elapsed_at_fraction(route.timing_profile, ratio, route.duration_seconds))
        arrival = departure + timedelta(seconds=elapsed)
        checkpoints.append(SampledCheckpoint(
            f"{route.provider_id}-cp-{index}", route.provider_id, miles,
            _point_at(points, cumulative, _geometry_distance_for_provider_miles(miles, provider_miles, geometry_meters)), elapsed,
            arrival.isoformat().replace("+00:00", "Z"), timing_method,
        ))
    segments = [SampledSegment(
        f"{route.provider_id}-seg-{index}", route.provider_id, start.id, end.id,
        end.distance_miles - start.distance_miles,
        _path_between(
            points,
            cumulative,
            _geometry_distance_for_provider_miles(start.distance_miles, provider_miles, geometry_meters),
            _geometry_distance_for_provider_miles(end.distance_miles, provider_miles, geometry_meters),
        ),
    ) for index, (start, end) in enumerate(zip(checkpoints, checkpoints[1:]))]
    return checkpoints, segments, {"provider_distance_miles": provider_miles, "geometry_distance_miles": geometry_meters * MILES_PER_METER, "timing_method": timing_method, "timing_span_count": len(route.timing_profile) - 1 if route.timing_profile else 0}
