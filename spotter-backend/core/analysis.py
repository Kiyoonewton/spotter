"""Deterministic, provider-free trip analysis for the first milestone."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import hypot
from uuid import uuid4

RISK_ORDER = {"Low": 1, "Moderate": 2, "High": 3, "Severe": 4, "No Travel": 5, "Unknown": 0}
SPACING = {10, 25, 50}


@dataclass(frozen=True)
class Weather:
    wind_mph: float | None
    rain_in_hr: float | None
    snow_in_hr: float | None


def classify_weather(weather: Weather, load_weight_lb: float) -> tuple[str, list[dict]]:
    reasons: list[dict] = []
    values = (("wind", weather.wind_mph), ("rain", weather.rain_in_hr), ("snow", weather.snow_in_hr))
    known: list[str] = []
    for condition, value in values:
        if value is None:
            continue
        known.append(condition)
        if condition == "wind":
            severity, threshold = (("No Travel", 55) if value >= 55 else ("Severe", 45) if value >= 45 else ("High", 35) if value >= 35 else ("Moderate", 25) if value >= 25 else ("Low", 0))
            if value >= 45 and value < 55 and load_weight_lb > 30000:
                severity, threshold = "No Travel", 30000
            elif value >= 35 and value < 45 and load_weight_lb > 40000:
                severity, threshold = "Severe", 40000
            reasons.append({"code": f"{condition}_{severity.lower().replace(' ', '_')}", "condition": condition, "observed": value, "threshold": threshold, "severity": severity, "explanation": f"Wind of {value:g} mph results in {severity} risk for a {load_weight_lb:g} lb load."})
        else:
            if condition == "rain":
                severity = "No Travel" if value > 1 else "Severe" if value >= .5 else "High" if value >= .25 else "Moderate" if value >= .1 else "Low"
                unit = "in/hr"
            else:
                severity = "No Travel" if value > 3 else "Severe" if value >= 2 else "High" if value >= 1 else "Moderate" if value >= .5 else "Low"
                unit = "in/hr"
            reasons.append({"code": f"{condition}_{severity.lower().replace(' ', '_')}", "condition": condition, "observed": value, "threshold": value, "severity": severity, "explanation": f"{condition.title()} of {value:g} {unit} results in {severity} risk."})
    if any(reason["severity"] == "No Travel" for reason in reasons):
        return "No Travel", reasons
    if len(known) < 3:
        return "Unknown", reasons
    return max((r["severity"] for r in reasons), key=lambda x: RISK_ORDER[x]), reasons


def _route(route_id: str, name: str, distance: float, minutes: int, weather_zones: list[Weather], request: dict) -> dict:
    spacing = request["checkpoint_spacing_miles"]
    count = int(distance // spacing)
    distances = [i * spacing for i in range(count + 1)]
    if not distances or distances[-1] != distance:
        distances.append(distance)
    start = datetime.fromisoformat(request["departure_at"])
    checkpoints = []
    for i, miles in enumerate(distances):
        elapsed = round(minutes * miles / distance)
        weather = weather_zones[min(i, len(weather_zones) - 1)]
        risk, reasons = classify_weather(weather, request["load_weight_lb"])
        checkpoints.append({"id": f"{route_id}-cp-{i}", "route_id": route_id, "coordinates": {"lat": 41.88 + i * .02, "lon": -87.63 + i * .03}, "distance_from_origin_miles": miles, "elapsed_minutes": elapsed, "arrival_at": (start + timedelta(minutes=elapsed)).isoformat(), "forecast_at": start.isoformat(), "weather": {"wind_mph": weather.wind_mph, "rain_in_hr": weather.rain_in_hr, "snow_in_hr": weather.snow_in_hr}, "risk": risk, "reasons": reasons})
    segments = []
    risk_miles = {key: 0.0 for key in RISK_ORDER}
    for i in range(len(checkpoints) - 1):
        cp = checkpoints[i]; end = checkpoints[i + 1]; miles = end["distance_from_origin_miles"] - cp["distance_from_origin_miles"]
        risk_miles[cp["risk"]] += miles
        segments.append({"id": f"{route_id}-seg-{i}", "start_checkpoint_id": cp["id"], "end_checkpoint_id": end["id"], "distance_miles": miles, "coordinates": [cp["coordinates"], end["coordinates"]], "risk": cp["risk"], "reasons": cp["reasons"]})
    assessed = distance - risk_miles["Unknown"]
    average = sum(m["distance_miles"] * RISK_ORDER[m["risk"]] for m in segments if m["risk"] != "Unknown") / assessed if assessed else None
    blocked = risk_miles["No Travel"] > 0
    eligibility = "blocked" if blocked else "incomplete" if risk_miles["Unknown"] else "eligible"
    return {"id": route_id, "name": name, "distance_miles": distance, "duration_minutes": minutes, "arrival_at": (start + timedelta(minutes=minutes)).isoformat(), "checkpoints": checkpoints, "segments": segments, "risk_miles": risk_miles, "average_risk": average, "forecast_coverage_miles": assessed, "forecast_coverage_percent": round(assessed / distance * 100, 2), "eligibility": eligibility, "blocking_reasons": ["No Travel segment"] if blocked else (["Missing forecast data"] if eligibility == "incomplete" else [])}


def analyze_trip(request: dict) -> dict:
    zones = [Weather(18, .02, 0), Weather(38, .31, 0), Weather(None, None, None), Weather(28, .12, 0), Weather(12, .01, 0)]
    routes = [_route("A", "Northern corridor", 468, 462, zones, request), _route("B", "Central corridor", 482, 480, zones[1:] + zones[:1], request), _route("C", "Southern corridor", 526, 522, [Weather(50, .02, 0), Weather(58, .01, 0), Weather(40, .2, 0), Weather(15, .01, 0), Weather(12, 0, 0)], request)]
    eligible = [r for r in routes if r["eligibility"] == "eligible"]
    eligible.sort(key=lambda r: (r["risk_miles"]["Severe"], r["risk_miles"]["High"], r["average_risk"], r["duration_minutes"], r["id"]))
    for rank, route in enumerate(eligible, 1): route["rank"] = rank
    winner = eligible[0] if eligible else None
    return {"analysis_id": str(uuid4()), "data_source": "demo", "demo_notice": "Illustrative deterministic routes and weather; no live providers are used.", "applied_request": request, "routes": routes, "recommendation": {"status": "recommended" if winner else "unavailable", "recommended_route_id": winner["id"] if winner else None, "explanation": f"{winner['name']} has the best eligible risk ranking." if winner else "No eligible route is available."}}
