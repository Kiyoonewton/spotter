"""Provider-neutral boundaries for the live routing milestone.

The adapters intentionally fail closed until provider credentials are configured.  The
deterministic fixtures keep CI and demo mode independent of paid upstream services.
"""
from __future__ import annotations

from dataclasses import dataclass
import os


class ProviderError(Exception):
    """An upstream request could not be completed or validated."""


@dataclass(frozen=True)
class LocationCandidate:
    provider_id: str
    label: str
    latitude: float
    longitude: float
    timezone: str | None


DEMO_LOCATIONS = (
    LocationCandidate("demo:chicago", "Chicago, IL", 41.8781, -87.6298, "America/Chicago"),
    LocationCandidate("demo:pittsburgh", "Pittsburgh, PA", 40.4406, -79.9959, "America/New_York"),
    LocationCandidate("demo:detroit", "Detroit, MI", 42.3314, -83.0458, "America/Detroit"),
)


def search_locations(query: str, *, mode: str = "demo") -> list[LocationCandidate]:
    if mode == "demo":
        normalized = query.casefold()
        return [candidate for candidate in DEMO_LOCATIONS if normalized in candidate.label.casefold()]
    if not os.getenv("GEOCODING_API_KEY"):
        raise ProviderError("Live geocoding requires GEOCODING_API_KEY.")
    raise ProviderError("Live geocoding adapter is configured but not enabled in this environment.")
