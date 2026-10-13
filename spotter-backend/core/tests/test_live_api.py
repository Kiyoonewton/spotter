from unittest.mock import patch
from rest_framework.test import APITestCase
from core.views import trip_analyses
from core.providers import ProviderError


class LiveAnalysisApiTests(APITestCase):
    def _payload(self, **overrides):
        payload = {
            "mode": "live", "origin": "New York, NY", "destination": "Boston, MA",
            "origin_coordinates": {"lat": 40.7, "lon": -74.0},
            "destination_coordinates": {"lat": 42.3, "lon": -71.1},
            "departure_at": "2026-10-10T10:00:00-05:00", "departure_timezone": "America/New_York",
            "load_weight_lb": 42000, "checkpoint_spacing_miles": 25,
        }
        payload.update(overrides)
        return payload

    def _view_response(self, payload):
        class ParsedRequest:
            data = payload

        return trip_analyses.cls.post(None, ParsedRequest())

    @patch("core.views.analyze_live", return_value={"data_source": "live", "routes": []})
    def test_live_non_demo_locations_reach_orchestration(self, analyze):
        response = self.client.post("/api/trip-analyses/", self._payload(), format="json")
        self.assertEqual(response.status_code, 200)
        analyze.assert_called_once()

    def test_demo_retains_supported_location_restriction(self):
        response = self.client.post("/api/trip-analyses/", self._payload(mode="demo"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("destination", response.data["errors"])

    @patch("core.views.analyze_live")
    def test_invalid_live_coordinates_rejected_before_provider_call(self, analyze):
        payload = self._payload(origin_coordinates={"lat": float("nan"), "lon": -74.0})
        response = self._view_response(payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("origin_coordinates", response.data["errors"])
        analyze.assert_not_called()

    @patch("core.views.analyze_live")
    def test_boolean_and_nonfinite_load_rejected(self, analyze):
        for value in (True, float("inf")):
            payload = self._payload(load_weight_lb=value)
            response = self._view_response(payload)
            self.assertEqual(response.status_code, 400)
            self.assertIn("load_weight_lb", response.data["errors"])
        analyze.assert_not_called()

    def test_live_requires_coordinates(self):
        payload = {"mode": "live", "origin": "Chicago, IL", "destination": "Pittsburgh, PA", "departure_at": "2026-10-10T10:00:00-05:00", "departure_timezone": "America/Chicago", "load_weight_lb": 42000, "checkpoint_spacing_miles": 25}
        response = self.client.post("/api/trip-analyses/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("origin_coordinates", response.data["errors"])

    @patch.dict("os.environ", {}, clear=True)
    def test_live_provider_configuration_is_structured(self):
        payload = {"mode": "live", "origin": "Chicago, IL", "destination": "Pittsburgh, PA", "origin_coordinates": {"lat": 41.8, "lon": -87.6}, "destination_coordinates": {"lat": 40.4, "lon": -80.0}, "departure_at": "2026-10-10T10:00:00-05:00", "departure_timezone": "America/Chicago", "load_weight_lb": 42000, "checkpoint_spacing_miles": 25}
        response = self.client.post("/api/trip-analyses/", payload, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "live_analysis_failed")

    @patch("core.views.analyze_live", side_effect=ProviderError("https://here.test?apiKey=fake-secret internal detail"))
    def test_live_provider_error_is_not_exposed(self, analyze):
        response = self.client.post("/api/trip-analyses/", self._payload(), format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], "Live analysis is temporarily unavailable.")
        self.assertEqual(response.data["code"], "live_analysis_failed")
        self.assertRegex(response.data["request_id"], r"^[0-9a-f-]{36}$")
        self.assertNotIn("fake-secret", str(response.data))
        self.assertNotIn("internal detail", str(response.data))
        analyze.assert_called_once()

