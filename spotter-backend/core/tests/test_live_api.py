from unittest.mock import patch
from rest_framework.test import APITestCase


class LiveAnalysisApiTests(APITestCase):
    def test_live_requires_coordinates(self):
        response = self.client.post("/api/trip-analyses/", {"mode": "live"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("origin_coordinates", response.data["errors"])

    @patch.dict("os.environ", {}, clear=True)
    def test_live_provider_configuration_is_structured(self):
        payload = {"mode": "live", "origin": "Chicago, IL", "destination": "Pittsburgh, PA", "origin_coordinates": {"lat": 41.8, "lon": -87.6}, "destination_coordinates": {"lat": 40.4, "lon": -80.0}, "departure_at": "2026-10-10T10:00:00-05:00", "departure_timezone": "America/Chicago", "load_weight_lb": 42000, "checkpoint_spacing_miles": 25}
        response = self.client.post("/api/trip-analyses/", payload, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "live_analysis_failed")

