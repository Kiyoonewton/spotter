"""Public error responses and logs must not expose provider exception details."""
from uuid import UUID
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIClient

from core.live_analysis import LiveAnalysisError
from core.providers import ProviderError
from core.routing import RoutingProviderError
from core.weather import WeatherProviderError


SENSITIVE_MESSAGE = (
    "https://provider.example/routes?apiKey=fake-secret "
    "internal detail /srv/private/provider.py"
)
LIVE_PAYLOAD = {
    "mode": "live",
    "origin": "New York, NY",
    "destination": "Boston, MA",
    "origin_coordinates": {"lat": 40.7, "lon": -74.0},
    "destination_coordinates": {"lat": 42.3, "lon": -71.1},
    "departure_at": "2026-10-10T10:00:00-04:00",
    "departure_timezone": "America/New_York",
    "load_weight_lb": 42000,
    "checkpoint_spacing_miles": 25,
}


class PublicProviderErrorTests(SimpleTestCase):
    def assert_safe_failure(self, response, logs, message, code, category):
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], message)
        self.assertEqual(response.data["code"], code)
        request_id = response.data["request_id"]
        self.assertEqual(str(UUID(request_id)), request_id)
        self.assertNotIn("routes", response.data)
        self.assertNotIn("results", response.data)
        public_and_logged = str(response.data) + "\n".join(logs.output)
        for private_value in (
            "fake-secret", "provider.example", "internal detail",
            "/srv/private/provider.py", "Traceback",
        ):
            self.assertNotIn(private_value, public_and_logged)
        self.assertIn(request_id, "\n".join(logs.output))
        self.assertIn(category, "\n".join(logs.output))
        self.assertTrue(all(record.exc_info is None for record in logs.records))

    def test_location_provider_failure_is_safe_and_does_not_fallback(self):
        with (
            patch("core.views.search_locations", side_effect=ProviderError(SENSITIVE_MESSAGE)) as search,
            patch("core.views.analyze_trip") as demo,
            self.assertLogs("core.views", level="WARNING") as logs,
        ):
            response = APIClient().get(
                "/api/locations/", {"q": "New York", "mode": "live"},
            )
        self.assert_safe_failure(
            response, logs, "Location search is temporarily unavailable.",
            "location_search_unavailable", "ProviderError",
        )
        self.assertIn("location search", "\n".join(logs.output))
        search.assert_called_once_with("New York", mode="live")
        demo.assert_not_called()

    def test_each_live_exception_is_safe_and_does_not_fallback(self):
        for error_type in (
            LiveAnalysisError, ProviderError, RoutingProviderError, WeatherProviderError,
        ):
            with self.subTest(category=error_type.__name__):
                with (
                    patch("core.views.analyze_live", side_effect=error_type(SENSITIVE_MESSAGE)) as live,
                    patch("core.views.analyze_trip") as demo,
                    self.assertLogs("core.views", level="WARNING") as logs,
                ):
                    response = APIClient().post(
                        "/api/trip-analyses/", LIVE_PAYLOAD, format="json",
                    )
                self.assert_safe_failure(
                    response, logs, "Live analysis is temporarily unavailable.",
                    "live_analysis_failed", error_type.__name__,
                )
                self.assertIn("live analysis", "\n".join(logs.output))
                live.assert_called_once()
                demo.assert_not_called()
