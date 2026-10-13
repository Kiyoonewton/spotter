import hashlib
import logging
import re
from uuid import uuid4

from django.db import DatabaseError
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .departure_comparison import ComparisonValidationError, compare_departures
from .models import SavedAnalysis
from .weather import WeatherProviderError

logger = logging.getLogger(__name__)


@api_view(["POST"])
def departure_comparisons(request):
    token = request.data.get("token") if isinstance(request.data, dict) else None
    if not isinstance(token, str) or not re.fullmatch(r"[a-f0-9]{64}", token):
        return Response({"error": "This saved analysis is unavailable or expired.", "code": "snapshot_unavailable"}, status=404)
    try:
        saved = SavedAnalysis.objects.filter(token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at__gt=timezone.now()).first()
        if saved is None:
            return Response({"error": "This saved analysis is unavailable or expired.", "code": "snapshot_unavailable"}, status=404)
        if saved.policy_version != "weather-risk-v1":
            return Response({"error": "This saved policy version is not supported for comparison.", "code": "unsupported_snapshot_policy"}, status=409)
        result = compare_departures(saved.analysis)
    except (ComparisonValidationError, KeyError, ValueError, TypeError):
        return Response({"error": "This saved analysis cannot be compared.", "code": "invalid_saved_analysis"}, status=422)
    except (DatabaseError, WeatherProviderError) as error:
        request_id = str(uuid4())
        logger.warning("departure comparison unavailable request_id=%s category=%s", request_id, type(error).__name__)
        return Response({"error": "Departure comparison is temporarily unavailable.", "code": "departure_comparison_unavailable", "request_id": request_id}, status=503)
    response = Response(result)
    response["Cache-Control"] = "no-store"
    return response
