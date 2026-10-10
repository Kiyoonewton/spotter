from datetime import datetime, timezone
from unittest.mock import patch

from django.test import SimpleTestCase

from core.live_analysis import analyze_live
from core.routing import NormalizedRoute
from core.weather import NormalizedWeather


ROUTE = NormalizedRoute("provider-a", [(41.0, -87.0), (41.0, -86.0)], 100000, 3600, [])
WEATHER = NormalizedWeather(20, 0.01, 0, "2026-10-10T11:00:00Z", "2026-10-10T10:00:00Z", "2026-10-10T11:00:00Z", 60, "fixture", "2026-10-10T09:00:00Z")


class LiveOrchestrationTests(SimpleTestCase):
    @patch("core.live_analysis.fetch_hourly", return_value=[WEATHER] * 3)
    @patch("core.live_analysis.calculate_routes", return_value=[ROUTE])
    def test_route_ownership_segments_and_recommendation(self, _routes, _weather):
        result = analyze_live({"origin_coordinates": {"lat": 41, "lon": -87}, "destination_coordinates": {"lat": 41, "lon": -86}, "departure_at": "2026-10-10T10:00:00-05:00", "load_weight_lb": 42000, "checkpoint_spacing_miles": 50})
        route = result["routes"][0]
        self.assertEqual(route["id"], "provider-a")
        self.assertTrue(all(point["route_id"] == "provider-a" for point in route["checkpoints"]))
        self.assertEqual(sum(segment["distance_miles"] for segment in route["segments"]), route["distance_miles"])
        self.assertEqual(result["recommendation"]["recommended_route_id"], "provider-a")
