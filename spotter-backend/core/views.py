from uuid import uuid4

from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
from zoneinfo import ZoneInfo
from .analysis import SPACING, analyze_trip


@api_view(["GET"])
def health(request):
    response = Response({"status": "ok"})
    response["X-Request-ID"] = str(uuid4())
    return response


@api_view(["POST"])
def trip_analyses(request):
    data = request.data if isinstance(request.data, dict) else {}
    errors = {}
    for field in ("origin", "destination", "departure_at", "departure_timezone", "load_weight_lb", "checkpoint_spacing_miles"):
        if field not in data or data[field] in (None, ""):
            errors[field] = "This field is required."
    if errors:
        return Response({"errors": errors}, status=400)
    if (data.get("origin", "").strip(), data.get("destination", "").strip()) != ("Chicago, IL", "Pittsburgh, PA"):
        errors["destination"] = "Demo analysis supports Chicago, IL to Pittsburgh, PA only."
    try:
        departure = datetime.fromisoformat(data["departure_at"])
        if departure.tzinfo is None: raise ValueError
    except (TypeError, ValueError):
        errors["departure_at"] = "Use an ISO 8601 timestamp with an offset."
    try: ZoneInfo(data["departure_timezone"])
    except Exception: errors["departure_timezone"] = "Use a valid IANA timezone."
    try:
        weight = float(data["load_weight_lb"])
        if weight < 0: raise ValueError
    except (TypeError, ValueError): errors["load_weight_lb"] = "Load weight must be a finite non-negative number."
    try:
        spacing = int(data["checkpoint_spacing_miles"])
        if spacing not in SPACING: raise ValueError
    except (TypeError, ValueError): errors["checkpoint_spacing_miles"] = "Checkpoint spacing must be 10, 25, or 50 miles."
    if errors: return Response({"errors": errors}, status=400)
    request_data = {"origin": data["origin"].strip(), "destination": data["destination"].strip(), "departure_at": departure.isoformat(), "departure_timezone": data["departure_timezone"], "load_weight_lb": weight, "checkpoint_spacing_miles": spacing}
    return Response(analyze_trip(request_data), status=200)
