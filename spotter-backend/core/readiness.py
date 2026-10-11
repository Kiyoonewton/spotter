"""Dependency readiness without exposing connection strings or exception text."""
import logging
from uuid import uuid4

from django.core.cache import cache
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(["GET"])
def readiness(request):
    request_id = str(uuid4())
    dependencies = {}
    for name, operation in (("database", check_database), ("cache", check_cache)):
        try:
            operation()
            dependencies[name] = "ready"
        except Exception as error:
            dependencies[name] = "unavailable"
            logger.warning("readiness failed request_id=%s operation=%s category=%s", request_id, name, type(error).__name__)
    ready = all(value == "ready" for value in dependencies.values())
    return Response({"status": "ready" if ready else "unavailable", "dependencies": dependencies, "request_id": request_id}, status=200 if ready else 503)


def check_database():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()


def check_cache():
    key = "readiness:" + str(uuid4())
    try:
        cache.set(key, "ready", timeout=10)
        if cache.get(key) != "ready":
            raise RuntimeError("Cache probe failed")
    finally:
        cache.delete(key)
