import json
import hashlib
import logging
import re
import secrets
from datetime import timedelta
from uuid import uuid4

from django.db import DatabaseError
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import SavedAnalysis

logger = logging.getLogger(__name__)
RETENTION_DAYS = 7


def save_analysis(result, inputs):
    """Persist only server results; saving failure must not discard a valid analysis."""
    result["applied_request"] = inputs
    if len(json.dumps(result, allow_nan=False).encode()) > 2_000_000:
        result["snapshot_notice"] = "This analysis is too large to save; the current results remain available."
        return result
    token = secrets.token_hex(32)
    try:
        saved = SavedAnalysis.objects.create(
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            analysis=result, expires_at=timezone.now() + timedelta(days=RETENTION_DAYS),
        )
    except DatabaseError as error:
        request_id = str(uuid4())
        logger.warning("snapshot save unavailable request_id=%s category=%s", request_id, type(error).__name__)
        result["snapshot_notice"] = "The analysis succeeded, but saving is temporarily unavailable."
        return result
    # Add the access token only after persistence: it is not stored in the JSON.
    result["snapshot"] = {
        "token": token, "created_at": saved.created_at.isoformat(),
        "expires_at": saved.expires_at.isoformat(), "policy_version": saved.policy_version,
    }
    return result


@api_view(["POST"])
def restore_analysis(request):
    # A body token avoids putting this bearer capability into proxy access URLs.
    token = request.data.get("token") if isinstance(request.data, dict) else None
    if not isinstance(token, str) or not re.fullmatch(r"[a-f0-9]{64}", token):
        return Response({"error": "This saved analysis is unavailable or expired.", "code": "snapshot_unavailable"}, status=404)
    try:
        saved = SavedAnalysis.objects.filter(
            token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at__gt=timezone.now(),
        ).first()
    except DatabaseError as error:
        request_id = str(uuid4())
        logger.warning("snapshot restore unavailable request_id=%s category=%s", request_id, type(error).__name__)
        return Response({"error": "Saved analyses are temporarily unavailable.", "code": "snapshot_restore_unavailable", "request_id": request_id}, status=503)
    if saved is None:
        return Response({"error": "This saved analysis is unavailable or expired.", "code": "snapshot_unavailable"}, status=404)
    result = dict(saved.analysis)
    result["snapshot"] = {
        "token": token, "created_at": saved.created_at.isoformat(),
        "expires_at": saved.expires_at.isoformat(), "policy_version": saved.policy_version,
    }
    response = Response(result)
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response
