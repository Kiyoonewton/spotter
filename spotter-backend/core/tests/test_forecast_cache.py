import os
import subprocess
import sys
from unittest import skipUnless
from unittest.mock import patch
from uuid import UUID, uuid4

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from redis.exceptions import ConnectionError
from rest_framework.test import APIClient

from core.corridor_forecast import corridor_forecast
from core.tests.test_corridor_forecast import payload, request_data


class CacheOutageTests(SimpleTestCase):
    @patch("core.forecast_cache.cache.set", side_effect=ConnectionError("redis://secret:FAKE_KEY@internal trace"))
    @patch("core.forecast_cache.cache.get", side_effect=ConnectionError("redis://secret:FAKE_KEY@internal trace"))
    @patch("core.corridor_forecast.fetch_forecasts", return_value=([payload()], "retrieved"))
    def test_cache_outage_still_returns_real_provider_forecast(self, fetch, read, write):
        with self.assertLogs("core.forecast_cache", level="WARNING") as logs:
            result = corridor_forecast(request_data())
        self.assertEqual(result["data_source"], "live")
        self.assertEqual(len(result["frames"]), 49)
        self.assertAlmostEqual(result["frames"][0]["samples"][0]["weather"]["wind_mph"], 10, places=4)
        fetch.assert_called_once()
        read.assert_called_once()
        write.assert_called_once()
        self.assertNotIn("FAKE_KEY", str(result) + str(logs.output))
        self.assertNotIn("internal trace", str(result) + str(logs.output))


class ReadinessTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_readiness_probes_database_and_cache(self):
        response = self.client.get("/api/ready")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["dependencies"], {"database": "ready", "cache": "ready"})
        UUID(response.data["request_id"])

    @patch("core.readiness.check_cache", side_effect=ConnectionError("redis://FAKE_KEY@internal trace"))
    def test_cache_failure_is_not_liveness_failure(self, probe):
        with self.assertLogs("core.readiness", level="WARNING") as logs:
            response = self.client.get("/api/ready")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["dependencies"]["cache"], "unavailable")
        UUID(response.data["request_id"])
        self.assertNotIn("FAKE_KEY", str(response.data) + str(logs.output))
        self.assertNotIn("internal trace", str(response.data) + str(logs.output))
        self.assertEqual(self.client.get("/api/health").status_code, 200)

    @patch("core.readiness.check_database", side_effect=RuntimeError("postgres://FAKE_KEY@internal"))
    def test_database_failure_is_safe(self, probe):
        with self.assertLogs("core.readiness", level="WARNING") as logs:
            response = self.client.get("/api/ready")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["dependencies"]["database"], "unavailable")
        self.assertNotIn("FAKE_KEY", str(response.data) + str(logs.output))


@skipUnless(os.environ.get("REDIS_URL"), "Real Redis integration requires REDIS_URL")
class SharedRedisTests(SimpleTestCase):
    def test_another_process_reads_the_same_cache_and_expiry(self):
        key = "integration:" + str(uuid4())
        script = "import django; django.setup(); from django.core.cache import cache; "
        try:
            cache.set(key, {"wind": 10}, timeout=30)
            result = subprocess.run([sys.executable, "-c", script + f"assert cache.get({key!r}) == {{'wind': 10}}"], check=True, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0)
            client = cache._cache.get_client(key)
            ttl = client.ttl(cache.make_key(key))
            self.assertGreater(ttl, 0)
            self.assertLessEqual(ttl, 30)
        finally:
            cache.delete(key)
