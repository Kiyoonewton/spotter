"""Weather-only departure scenarios on immutable saved routes and driving timing."""
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from .analysis import RISK_ORDER, Weather, classify_weather
from .corridor_forecast import forecast_payloads, CACHE_SECONDS, MAX_POINTS
from .forecast_cache import write_forecast
from .weather import select_hour

OFFSETS = (0, 2, 4, 6)


class ComparisonValidationError(ValueError):
    pass


def _instant(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ComparisonValidationError("Missing arrival timezone.")
    return result.astimezone(timezone.utc)


def _iso(value):
    return value.isoformat().replace("+00:00", "Z")


def _risk_key(route):
    return (route["risk_miles"]["Severe"], route["risk_miles"]["High"],
            route["average_risk"] if route["average_risk"] is not None else float("inf"),
            route["duration_minutes"], route["id"])


def _scenario_route(route, offset, load, payloads, retrieved, demo):
    checkpoints = []
    by_id = {}
    for point in route["checkpoints"]:
        arrival = _instant(point["arrival_at"]) + timedelta(hours=offset)
        if demo:
            weather = point["weather"]
        else:
            coordinate = point["coordinates"]
            normalized = select_hour(payloads[(coordinate["lat"], coordinate["lon"])], arrival, retrieved)
            weather = None if normalized is None else asdict(normalized)
        values = Weather(None, None, None) if weather is None else Weather(weather["wind_mph"], weather["rain_in_hr"], weather["snow_in_hr"])
        risk, reasons = classify_weather(values, load)
        checkpoint = {"id": point["id"], "route_id": route["id"], "arrival_at": _iso(arrival),
                      "risk": risk, "weather": weather, "reasons": reasons}
        checkpoints.append(checkpoint)
        by_id[point["id"]] = checkpoint
    miles = {name: 0.0 for name in RISK_ORDER}
    segments = []
    for segment in route["segments"]:
        risk = by_id[segment["start_checkpoint_id"]]["risk"]
        miles[risk] += segment["distance_miles"]
        segments.append({"id": segment["id"], "risk": risk})
    covered = route["distance_miles"] - miles["Unknown"]
    average = sum(miles[name] * RISK_ORDER[name] for name in RISK_ORDER if name != "Unknown") / covered if covered > 0 else None
    eligibility = "blocked" if miles["No Travel"] > 0 else "incomplete" if miles["Unknown"] > 0 else "eligible"
    return {"id": route["id"], "distance_miles": route["distance_miles"],
            "duration_minutes": route["duration_minutes"], "arrival_at": checkpoints[-1]["arrival_at"],
            "risk_miles": miles, "average_risk": average, "eligibility": eligibility,
            "forecast_coverage_percent": max(0, min(100, covered / route["distance_miles"] * 100)),
            "checkpoints": checkpoints, "segment_risks": segments}


def compare_departures(analysis):
    routes, inputs = analysis["routes"], analysis["applied_request"]
    if not routes or len(routes) > 3:
        raise ComparisonValidationError("Invalid alternatives.")
    points = []
    for route in routes:
        if not route["checkpoints"] or not route.get("segments") or route["distance_miles"] <= 0:
            raise ComparisonValidationError("Missing route-owned timing or segments.")
        for point in route["checkpoints"]:
            if point["route_id"] != route["id"]:
                raise ComparisonValidationError("Foreign checkpoint.")
            points.append({"id": point["id"], "route_id": route["id"], "coordinates": point["coordinates"]})
    if len(points) > MAX_POINTS:
        raise ComparisonValidationError("Checkpoint budget exceeded.")
    start = _instant(inputs["departure_at"])
    demo = analysis["data_source"] == "demo"
    payloads, retrieved, pending_cache = ({}, None, []) if demo else forecast_payloads(points, start)
    windows, candidates = [], []
    for offset in OFFSETS:
        results = [_scenario_route(route, offset, inputs["load_weight_lb"], payloads, retrieved, demo) for route in routes]
        eligible = sorted((route for route in results if route["eligibility"] == "eligible"), key=_risk_key)
        windows.append({"offset_hours": offset, "departure_at": _iso(start + timedelta(hours=offset)),
                        "routes": results, "recommended_route_id": eligible[0]["id"] if eligible else None})
        candidates.extend((offset, route) for route in eligible)
    best = min(candidates, key=lambda pair: (*_risk_key(pair[1])[:3], _instant(pair[1]["arrival_at"]), pair[0], pair[1]["id"])) if candidates else None
    baseline = next((route for route in windows[0]["routes"] if route["id"] == windows[0]["recommended_route_id"]), None)
    choice = None
    if best:
        offset, route = best
        choice = {"offset_hours": offset, "route_id": route["id"], "arrival_at": route["arrival_at"],
                  "arrival_delay_minutes": (_instant(route["arrival_at"]) - _instant(baseline["arrival_at"])).total_seconds() / 60 if baseline else None,
                  "severe_miles_reduction": baseline["risk_miles"]["Severe"] - route["risk_miles"]["Severe"] if baseline else None,
                  "average_risk_reduction": baseline["average_risk"] - route["average_risk"] if baseline and baseline["average_risk"] is not None and route["average_risk"] is not None else None,
                  "high_miles_reduction": baseline["risk_miles"]["High"] - route["risk_miles"]["High"] if baseline else None}
    for key, result in pending_cache:
        write_forecast(key, result, CACHE_SECONDS)
    return {"source_analysis_id": analysis["analysis_id"], "data_source": analysis["data_source"],
            "computed_at": _iso(datetime.now(timezone.utc)), "retrieved_at": retrieved,
            "windows": windows, "best_choice": choice,
            "notice": "Weather-only scenarios on saved routes and driving times. Traffic, road closures and driver breaks are not recalculated. Original analysis is unchanged.",
            "forecast_notice": "Demo weather is fixed across windows; no live forecasts requested." if demo else "All windows, including the baseline, use the same newly acquired or cached forecast series. Missing coverage remains incomplete.",
            "ranking_policy": "Within each window: Severe miles, High miles, average risk, travel time. Across windows: Severe miles, High miles, average risk, earliest arrival, least waiting, stable route ID."}
