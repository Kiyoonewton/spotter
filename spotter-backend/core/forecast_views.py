import logging
from uuid import uuid4

from rest_framework.decorators import api_view
from rest_framework.response import Response
from .corridor_forecast import ForecastValidationError, corridor_forecast
from .weather import WeatherProviderError

logger = logging.getLogger(__name__)


@api_view(["POST"])
def corridor_forecasts(request):
    try:
        result = corridor_forecast(request.data)
    except ForecastValidationError:
        return Response({"error": "Invalid corridor forecast request. Provide offset-aware start_at, finite non-negative load_weight_lb, 1 to 200 uniquely identified coordinate points, and optional integer horizon_hours from 1 to 720.", "code": "invalid_corridor_forecast"}, status=400)
    except WeatherProviderError as error:
        request_id = str(uuid4())
        logger.warning("corridor forecast unavailable request_id=%s category=%s", request_id, type(error).__name__)
        return Response({"error": "Corridor forecast is temporarily unavailable.", "code": "corridor_forecast_unavailable", "request_id": request_id}, status=503)
    return Response(result)
