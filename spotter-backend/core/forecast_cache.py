"""Best-effort forecast cache: provider access remains available during outages."""
import logging

from django.core.cache import cache
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


def read_forecast(key):
    try:
        return cache.get(key)
    except (RedisError, OSError) as error:
        logger.warning("forecast cache unavailable operation=read category=%s", type(error).__name__)
        return None


def write_forecast(key, value, timeout):
    try:
        cache.set(key, value, timeout)
    except (RedisError, OSError) as error:
        logger.warning("forecast cache unavailable operation=write category=%s", type(error).__name__)
