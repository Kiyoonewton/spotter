"""Provider-neutral boundaries for the live routing milestone.

The adapters intentionally fail closed until provider credentials are configured.  The
deterministic fixtures keep CI and demo mode independent of paid upstream services.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


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
    key = os.getenv("OPENCAGE_API_KEY")
    if not key:
        raise ProviderError("Live geocoding requires OPENCAGE_API_KEY.")
    params = urlencode({"q": query, "key": key, "limit": 5, "no_annotations": 1})
    request = Request(
        f"https://api.opencagedata.com/geocode/v1/json?{params}",
        headers={"Accept": "application/json", "User-Agent": "spotter/1.0"},
    )
    try:
        with urlopen(request, timeout=5) as response:
            payload = json.load(response)
    except HTTPError as error:
        if error.code in {401, 403}:
            raise ProviderError("OpenCage authentication failed.") from error
        if error.code == 429:
            raise ProviderError("OpenCage rate limit exceeded; retry later.") from error
        raise ProviderError("OpenCage geocoding request failed.") from error
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise ProviderError("OpenCage geocoding request timed out or returned invalid data.") from error
    if not isinstance(payload, dict) or payload.get("status", {}).get("code") != 200:
        raise ProviderError("OpenCage returned an invalid geocoding response.")
    results = payload.get("results")
    if not isinstance(results, list):
        raise ProviderError("OpenCage returned malformed results.")
    candidates: list[LocationCandidate] = []
    for item in results[:5]:
        try:
            geometry = item["geometry"]
            latitude, longitude = float(geometry["lat"]), float(geometry["lng"])
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValueError
            candidates.append(LocationCandidate(
                provider_id=f"opencage:{latitude:.6f}:{longitude:.6f}",
                label=str(item["formatted"]), latitude=latitude, longitude=longitude,
                timezone=(item.get("annotations", {}).get("timezone") or {}).get("name"),
            ))
        except (KeyError, TypeError, ValueError):
            raise ProviderError("OpenCage returned malformed location data.")
    return candidates
