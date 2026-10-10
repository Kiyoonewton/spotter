"""Orchestrates validated live providers into the existing risk engine contract."""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from .analysis import RISK_ORDER, Weather, classify_weather
from .checkpoints import sample_route
from .routing import RouteRequest, calculate_routes
from .weather import WeatherCheckpoint, WeatherProviderError, fetch_hourly


class LiveAnalysisError(Exception):
    pass


def _route_result(route, request, weather_by_index):
    checkpoints, sampled_segments, timing = sample_route(route, request["checkpoint_spacing_miles"], request["departure_at"])
    output_checkpoints, risk_by_id = [], {}
    for checkpoint, weather in zip(checkpoints, weather_by_index):
        values = None if weather is None else Weather(weather.wind_mph, weather.rain_in_hr, weather.snow_in_hr)
        risk, reasons = classify_weather(values or Weather(None, None, None), request["load_weight_lb"])
        risk_by_id[checkpoint.id] = risk
        output_checkpoints.append({
            "id": checkpoint.id, "route_id": checkpoint.route_id,
            "coordinates": {"lat": checkpoint.coordinates[0], "lon": checkpoint.coordinates[1]},
            "distance_from_origin_miles": checkpoint.distance_miles,
            "elapsed_minutes": round(checkpoint.elapsed_seconds / 60), "arrival_at": checkpoint.arrival_at,
            "timing_method": checkpoint.timing_method,
            "weather": None if weather is None else {"wind_mph": weather.wind_mph, "rain_in_hr": weather.rain_in_hr, "snow_in_hr": weather.snow_in_hr, "forecast_valid_at": weather.forecast_valid_at, "interval_start": weather.interval_start, "interval_end": weather.interval_end, "provider": weather.provider, "retrieved_at": weather.retrieved_at},
            "risk": risk, "reasons": reasons,
        })
    risk_miles = {name: 0.0 for name in RISK_ORDER}
    segments = []
    for segment in sampled_segments:
        risk = risk_by_id[segment.start_checkpoint_id]
        risk_miles[risk] += segment.distance_miles
        segments.append({"id": segment.id, "route_id": segment.route_id, "start_checkpoint_id": segment.start_checkpoint_id, "end_checkpoint_id": segment.end_checkpoint_id, "distance_miles": segment.distance_miles, "coordinates": [{"lat": p[0], "lon": p[1]} for p in segment.coordinates], "risk": risk})
    distance = route.distance_meters * 0.000621371192
    covered = distance - risk_miles["Unknown"]
    eligible = "blocked" if risk_miles["No Travel"] else "incomplete" if risk_miles["Unknown"] else "eligible"
    average = sum(RISK_ORDER[s["risk"]] * s["distance_miles"] for s in segments if s["risk"] != "Unknown") / covered if covered else None
    return {"id": route.provider_id, "name": f"HERE truck route {route.provider_id}", "distance_miles": distance, "duration_minutes": round(route.duration_seconds / 60), "checkpoints": output_checkpoints, "segments": segments, "timing_method": timing["timing_method"], "risk_miles": risk_miles, "unknown_miles": risk_miles["Unknown"], "forecast_coverage_percent": round(covered / distance * 100, 2) if distance else 0, "average_risk": average, "eligibility": eligible, "provider_limitations": ["HERE truck profile; no hazardous-material suitability claim", "Timing uses distance-proportional estimate from section totals"]}


def analyze_live(request: dict) -> dict:
    origin, destination = request["origin_coordinates"], request["destination_coordinates"]
    routes = calculate_routes(RouteRequest(origin["lat"], origin["lon"], destination["lat"], destination["lon"], request["departure_at"]))
    if sum(len(route.coordinates) for route in routes) > 200:
        raise LiveAnalysisError("Route checkpoint limit exceeded; reduce route complexity.")
    sampled = [sample_route(route, request["checkpoint_spacing_miles"], request["departure_at"])[0] for route in routes]
    unique = {(point.coordinates, point.arrival_at): point for group in sampled for point in group}
    weather = fetch_hourly([WeatherCheckpoint(point.coordinates[0], point.coordinates[1], datetime.fromisoformat(point.arrival_at.replace("Z", "+00:00"))) for point in unique.values()])
    weather_by_key = dict(zip(unique, weather))
    results = [_route_result(route, request, [weather_by_key.get((point.coordinates, point.arrival_at)) for point in group]) for route, group in zip(routes, sampled)]
    eligible = [route for route in results if route["eligibility"] == "eligible"]
    eligible.sort(key=lambda route: (route["risk_miles"]["Severe"], route["risk_miles"]["High"], route["average_risk"], route["duration_minutes"], route["id"]))
    winner = eligible[0] if eligible else None
    return {"analysis_id": str(uuid4()), "data_source": "live", "available_route_count": len(results), "routes": results, "recommendation": {"status": "recommended" if winner else "unavailable", "recommended_route_id": winner["id"] if winner else None, "explanation": f"{winner['id']} has the best eligible risk ranking." if winner else "No fully eligible route is available."}}
