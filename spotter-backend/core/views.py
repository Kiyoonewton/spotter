from uuid import uuid4
import math
import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
from zoneinfo import ZoneInfo
from .truck_profile import TruckProfileError, validate_truck_profile
from .snapshots import save_analysis
from .analysis import SPACING, analyze_trip
from .providers import ProviderError, search_locations
from .live_analysis import LiveAnalysisError, analyze_live
from .routing import RoutingProviderError
from .weather import WeatherProviderError

logger = logging.getLogger(__name__)


@api_view(["GET"])
def health(request):
    response = Response({"status": "ok"})
    response["X-Request-ID"] = str(uuid4())
    return response


@api_view(["GET"])
def locations(request):
    query = str(request.query_params.get("q", "")).strip()
    if len(query) < 2 or len(query) > 120:
        return Response({"results": [], "error": "q must contain 2 to 120 characters."}, status=400)
    mode = str(request.query_params.get("mode", "demo"))
    if mode not in {"demo", "live"}:
        return Response({"error": "mode must be demo or live."}, status=400)
    try:
        candidates = search_locations(query, mode=mode)
    except ProviderError as error:
        request_id = str(uuid4())
        logger.warning("location search unavailable request_id=%s category=%s", request_id, type(error).__name__)
        return Response({"error": "Location search is temporarily unavailable.", "code": "location_search_unavailable", "request_id": request_id}, status=503)
    return Response({"results": [candidate.__dict__ for candidate in candidates]})


@api_view(["POST"])
def trip_analyses(request):
    data = request.data if isinstance(request.data, dict) else {}
    mode = data.get("mode", "demo")
    if not isinstance(data.get("save_snapshot", False), bool):
        return Response({"errors": {"save_snapshot": "Use a boolean."}}, status=400)
    if mode not in {"demo", "live"}:
        return Response({"errors": {"mode": "mode must be demo or live."}}, status=400)
    errors = {}
    for field in ("origin", "destination", "departure_at", "departure_timezone", "load_weight_lb", "checkpoint_spacing_miles"):
        if field not in data or data[field] in (None, ""):
            errors[field] = "This field is required."
    if errors:
        return Response({"errors": errors}, status=400)
    if mode == "live":
        for field in ("origin_coordinates", "destination_coordinates"):
            value = data.get(field)
            if (not isinstance(value, dict) or isinstance(value.get("lat"), bool) or isinstance(value.get("lon"), bool) or not isinstance(value.get("lat"), (int, float)) or not isinstance(value.get("lon"), (int, float)) or not math.isfinite(value["lat"]) or not math.isfinite(value["lon"]) or not -90 <= value["lat"] <= 90 or not -180 <= value["lon"] <= 180):
                errors[field] = "Valid latitude and longitude coordinates are required for live mode."
        if errors:
            return Response({"errors": errors}, status=400)
    if mode == "demo" and (data.get("origin", "").strip(), data.get("destination", "").strip()) != ("Chicago, IL", "Pittsburgh, PA"):
        errors["destination"] = "Demo analysis supports Chicago, IL to Pittsburgh, PA only."
    try:
        departure = datetime.fromisoformat(data["departure_at"])
        if departure.tzinfo is None: raise ValueError
    except (TypeError, ValueError):
        errors["departure_at"] = "Use an ISO 8601 timestamp with an offset."
    try: ZoneInfo(data["departure_timezone"])
    except Exception: errors["departure_timezone"] = "Use a valid IANA timezone."
    try:
        if isinstance(data["load_weight_lb"], bool): raise ValueError
        weight = float(data["load_weight_lb"])
        if not math.isfinite(weight) or weight < 0: raise ValueError
    except (TypeError, ValueError): errors["load_weight_lb"] = "Load weight must be a finite non-negative number."
    try:
        spacing = int(data["checkpoint_spacing_miles"])
        if spacing not in SPACING: raise ValueError
    except (TypeError, ValueError): errors["checkpoint_spacing_miles"] = "Checkpoint spacing must be 10, 25, or 50 miles."
    profile = None
    if "truck_profile" in data:
        if mode != "live": errors["truck_profile"] = "Truck profiles are only supported in live mode."
        elif "load_weight_lb" not in errors:
            try: profile = validate_truck_profile(data["truck_profile"], weight)
            except TruckProfileError: errors["truck_profile"] = "Enter all six valid vehicle measurements. Loaded weight must exceed cargo, stay within rated gross weight, and include a valid heaviest axle weight."
    if errors: return Response({"errors": errors}, status=400)
    request_data = {"origin": data["origin"].strip(), "destination": data["destination"].strip(), "departure_at": departure.isoformat(), "departure_timezone": data["departure_timezone"], "load_weight_lb": weight, "checkpoint_spacing_miles": spacing}
    if profile is not None: request_data["truck_profile"] = profile
    if mode == "live":
        request_data.update({"origin_coordinates": data["origin_coordinates"], "destination_coordinates": data["destination_coordinates"], "origin_label": data["origin"].strip(), "destination_label": data["destination"].strip()})
        try:
            result = analyze_live(request_data)
            if data.get("save_snapshot"):
                result = save_analysis(result, {**request_data, "mode": mode})
            return Response(result, status=200)
        except (LiveAnalysisError, ProviderError, RoutingProviderError, WeatherProviderError) as error:
            request_id = str(uuid4())
            logger.warning("live analysis unavailable request_id=%s category=%s", request_id, type(error).__name__)
            return Response({"error": "Live analysis is temporarily unavailable.", "code": "live_analysis_failed", "request_id": request_id}, status=503)
    result = analyze_trip(request_data)
    result["data_source"] = "demo"
    if data.get("save_snapshot"):
        result = save_analysis(result, {**request_data, "mode": mode})
    return Response(result, status=200)
