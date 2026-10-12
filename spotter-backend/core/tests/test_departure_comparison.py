import copy
import hashlib
from datetime import timedelta
from unittest.mock import patch
from uuid import UUID
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from core.departure_comparison import compare_departures, ComparisonValidationError
from core.models import SavedAnalysis
from core.weather import WeatherProviderError


def route(identity, duration=60):
    return {"id": identity, "name": identity, "distance_miles": 100, "duration_minutes": duration,
            "checkpoints": [{"id": f"{identity}-start", "route_id": identity, "coordinates": {"lat": 40, "lon": -74 if identity == "a" else -73}, "arrival_at": "2026-10-13T00:00:00Z", "weather": {"wind_mph": 10, "rain_in_hr": 0, "snow_in_hr": 0}},
                            {"id": f"{identity}-end", "route_id": identity, "coordinates": {"lat": 40, "lon": -74 if identity == "a" else -73}, "arrival_at": f"2026-10-13T{duration // 60:02d}:00:00Z", "weather": {"wind_mph": 10, "rain_in_hr": 0, "snow_in_hr": 0}}],
            "segments": [{"id": identity + "-segment", "start_checkpoint_id": identity + "-start", "distance_miles": 100}]}


def analysis(mode="live"):
    return {"analysis_id": "source-owned", "data_source": mode, "routes": [route("a"), route("b", 180)],
            "applied_request": {"departure_at": "2026-10-13T00:00:00Z", "load_weight_lb": 42000},
            "recommendation": {"recommended_route_id": None}}


def payload(wind):
    return {"hourly_units": {"wind_speed_10m": "km/h", "rain": "mm", "showers": "mm", "snowfall": "cm"},
            "hourly": {"time": [f"2026-10-13T{i:02d}:00" for i in range(12)], "wind_speed_10m": [value * 1.609344 for value in wind],
                       "rain": [0] * 12, "showers": [0] * 12, "snowfall": [0] * 12}}


class DepartureDomainTests(SimpleTestCase):
    @patch("core.departure_comparison.forecast_payloads")
    def test_all_routes_all_windows_share_forecasts_and_preserve_source(self, fetch):
        source = analysis()
        before = copy.deepcopy(source)
        a = payload([60, 60, 40, 40, 10, 10, 10, 10, 10, 10, 10, 10])
        b = payload([60, 60, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10])
        fetch.return_value = ({(40, -74): a, (40, -73): b}, "retrieved", [])
        result = compare_departures(source)
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual([window["offset_hours"] for window in result["windows"]], [0, 2, 4, 6])
        self.assertIsNone(result["windows"][0]["recommended_route_id"])
        self.assertEqual(result["windows"][1]["recommended_route_id"], "b")
        self.assertEqual(result["windows"][2]["recommended_route_id"], "a")
        self.assertEqual(result["best_choice"]["route_id"], "b")
        self.assertEqual(result["best_choice"]["offset_hours"], 2)
        self.assertIsNone(result["best_choice"]["arrival_delay_minutes"])
        self.assertEqual(result["windows"][1]["routes"][0]["risk_miles"]["Severe"], 100)
        self.assertEqual(source, before)
        self.assertEqual(result["windows"][1]["routes"][1]["checkpoints"][-1]["arrival_at"], "2026-10-13T05:00:00Z")

    @patch("core.departure_comparison.forecast_payloads")
    def test_no_travel_and_unknown_cannot_win_and_no_horizon_clamping(self, fetch):
        blocked = payload([60] * 12)
        unknown = payload([10] * 12)
        unknown["hourly"]["snowfall"] = [None] * 12
        fetch.return_value = ({(40, -74): blocked, (40, -73): unknown}, "retrieved", [])
        result = compare_departures(analysis())
        self.assertIsNone(result["best_choice"])
        self.assertTrue(all(window["recommended_route_id"] is None for window in result["windows"]))
        self.assertEqual(result["windows"][0]["routes"][0]["eligibility"], "blocked")
        self.assertEqual(result["windows"][0]["routes"][1]["eligibility"], "incomplete")
        short = payload([10])
        short["hourly"] = {name: values[:1] for name, values in short["hourly"].items()}
        fetch.return_value = ({(40, -74): short, (40, -73): short}, "retrieved", [])
        late = compare_departures(analysis())["windows"][-1]
        self.assertTrue(all(route["eligibility"] == "incomplete" for route in late["routes"]))

    @patch("core.departure_comparison.forecast_payloads")
    def test_benefit_is_measured_against_fresh_eligible_baseline(self, fetch):
        a = payload([10] * 12)
        a["hourly"]["rain"][1] = 0.3 * 25.4
        fetch.return_value = ({(40, -74): a, (40, -73): payload([60] * 12)}, "retrieved", [])
        result = compare_departures(analysis())
        choice = result["best_choice"]
        self.assertEqual(choice["offset_hours"], 2)
        self.assertEqual(choice["route_id"], "a")
        self.assertEqual(choice["arrival_delay_minutes"], 120)
        self.assertEqual(choice["high_miles_reduction"], 100)
        self.assertEqual(choice["average_risk_reduction"], 2)

    @patch("core.departure_comparison.forecast_payloads")
    def test_demo_fixed_weather_prefers_no_waiting_and_no_provider(self, fetch):
        result = compare_departures(analysis("demo"))
        fetch.assert_not_called()
        self.assertEqual(result["best_choice"]["offset_hours"], 0)
        self.assertEqual(result["best_choice"]["route_id"], "a")
        self.assertEqual(result["best_choice"]["arrival_delay_minutes"], 0)

    @patch("core.departure_comparison.forecast_payloads")
    def test_checkpoint_budget_and_foreign_ownership_before_weather(self, fetch):
        source = analysis()
        source["routes"][0]["checkpoints"][0]["route_id"] = "foreign"
        with self.assertRaises(ComparisonValidationError):
            compare_departures(source)
        source = analysis()
        source["routes"][0]["checkpoints"] *= 101
        with self.assertRaises(ComparisonValidationError):
            compare_departures(source)
        fetch.assert_not_called()


class DepartureAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.token = "a" * 64
        self.record = SavedAnalysis.objects.create(token_hash=hashlib.sha256(self.token.encode()).hexdigest(), analysis=analysis("demo"), expires_at=timezone.now() + timedelta(days=1))

    def test_restore_bound_demo_comparison_does_not_modify_snapshot(self):
        response = self.client.post("/api/departure-comparisons/", {"token": self.token}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.record.refresh_from_db()
        self.assertEqual(self.record.analysis, analysis("demo"))
        self.assertEqual(response.data["best_choice"]["offset_hours"], 0)

    def test_expired_and_unsupported_snapshots(self):
        response = self.client.post("/api/departure-comparisons/", {"token": "bad"}, format="json")
        self.assertEqual(response.status_code, 404)
        self.record.policy_version = "future-policy"
        self.record.save()
        self.assertEqual(self.client.post("/api/departure-comparisons/", {"token": self.token}, format="json").status_code, 409)
        self.record.expires_at = timezone.now() - timedelta(seconds=1)
        self.record.save()
        self.assertEqual(self.client.post("/api/departure-comparisons/", {"token": self.token}, format="json").status_code, 404)

    @patch("core.departure_views.compare_departures")
    def test_provider_failure_is_safe_and_does_not_fall_back(self, compare):
        compare.side_effect = WeatherProviderError("https://provider?apikey=FAKE_KEY internal detail")
        with self.assertLogs("core.departure_views", level="WARNING") as logs:
            response = self.client.post("/api/departure-comparisons/", {"token": self.token}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "departure_comparison_unavailable")
        UUID(response.data["request_id"])
        self.assertNotIn("FAKE_KEY", str(response.data) + str(logs.output))
        self.assertNotIn("windows", response.data)
