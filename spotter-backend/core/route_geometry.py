"""Shared decoded-route distance calculation in meters."""
from math import asin, cos, radians, sin, sqrt


def geodesic_distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    radius = 6_371_008.8
    lat1, lat2 = radians(a[0]), radians(b[0])
    dlat, dlon = lat2 - lat1, radians(b[1] - a[1])
    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return radius * 2 * asin(sqrt(value))

