from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import UUID

from django.core.cache import cache
from django.test import SimpleTestCase
from rest_framework.test import APIClient

from core.analysis import Weather, classify_weather
from core.corridor_forecast import corridor_forecast
from core.weather import WeatherProviderError


def payload():
    start = datetime(2026, 10, 11, tzinfo=timezone.utc)
    return {"hourly_units": {"wind_speed_10m": "km/h", "rain": "mm", "showers": "mm", "snowfall": "cm"},
            "hourly": {"time": [(start + timedelta(hours=i)).isoformat() for i in range(51)],
                       "wind_speed_10m": [16.0934] * 51, "rain": [1] * 51,
                       "showers": [1] * 51, "snowfall": [0] * 51}}


def request_data():
    return {"start_at": "2026-10-10T20:00:00-04:00", "load_weight_lb": 30000,
            "points": [{"id": "a-point", "route_id": "a", "coordinates": {"lat": 40, "lon": -74}},
                       {"id": "b-point", "route_id": "b", "coordinates": {"lat": 40, "lon": -74}}]}


class CorridorForecastTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_49_frames_deduplicate_coordinates_keep_ownership_and_cache(self, fetch):
        fetch.return_value = ([payload()], "2026-10-11T00:00:00Z")
        result = corridor_forecast(request_data())
        self.assertEqual(len(result["frames"]), 49)
        self.assertEqual(result["frames"][0]["valid_at"], "2026-10-11T00:00:00Z")
        self.assertEqual(result["frames"][48]["valid_at"], "2026-10-13T00:00:00Z")
        self.assertEqual([s["route_id"] for s in result["frames"][0]["samples"]], ["a", "b"])
        sample = result["frames"][0]["samples"][0]
        self.assertAlmostEqual(sample["weather"]["wind_mph"], 10, places=4)
        self.assertEqual(sample["weather"]["wind_valid_at"], "2026-10-11T00:00:00Z")
        self.assertEqual(sample["weather"]["interval_start"], "2026-10-11T00:00:00Z")
        self.assertEqual(sample["weather"]["interval_end"], "2026-10-11T01:00:00Z")
        self.assertEqual(len(fetch.call_args.args[0]), 1)
        corridor_forecast({**request_data(), "load_weight_lb": 40001})
        self.assertEqual(fetch.call_count, 1)

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_requested_journey_window_and_longer_than_48_hours(self, fetch):
        fetch.return_value = ([payload()], "2026-10-11T00:00:00Z")
        for hours in (1, 9, 60):
            response = self.client.post("/api/corridor-forecasts/",
                                        {**request_data(), "horizon_hours": hours}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["horizon_hours"], hours)
            self.assertEqual(len(response.data["frames"]), hours + 1)
            self.assertEqual(response.data["frames"][-1]["hour"], hours)
            expected = datetime(2026, 10, 11, tzinfo=timezone.utc) + timedelta(hours=hours)
            self.assertEqual(response.data["frames"][-1]["valid_at"], expected.isoformat().replace("+00:00", "Z"))
        self.assertIsNone(response.data["frames"][-1]["samples"][0]["weather"])
        self.assertEqual(fetch.call_count, 1)

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_invalid_horizon_does_not_call_weather(self, fetch):
        for hours in (True, 0, -1, 1.5, "9", 721, None):
            response = self.client.post("/api/corridor-forecasts/",
                                        {**request_data(), "horizon_hours": hours}, format="json")
            self.assertEqual(response.status_code, 400)
        fetch.assert_not_called()

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_horizon_and_independently_missing_values(self, fetch):
        fixture = payload()
        fixture["hourly"]["wind_speed_10m"][1] = None
        fixture["hourly"]["time"] = fixture["hourly"]["time"][:3]
        for field in ("wind_speed_10m", "rain", "showers", "snowfall"):
            fixture["hourly"][field] = fixture["hourly"][field][:3]
        fetch.return_value = ([fixture], "retrieved")
        result = corridor_forecast(request_data())
        sample = result["frames"][1]["samples"][0]
        self.assertIsNone(sample["weather"]["wind_mph"])
        self.assertIsNotNone(sample["weather"]["rain_in_hr"])
        self.assertEqual(sample["risks"]["wind"], "Unknown")
        self.assertIsNone(result["frames"][2]["samples"][0]["weather"])

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_invalid_inputs_never_call_provider(self, fetch):
        for update in ({"points": []}, {"load_weight_lb": True},
                       {"load_weight_lb": float("inf")}, {"start_at": "2026-10-11T00:00:00"},
                       {"points": request_data()["points"] * 101},
                       {"points": [request_data()["points"][0]] * 2}):
            response = self.client.post("/api/corridor-forecasts/", {**request_data(), **update},
                                        format="json") if update.get("load_weight_lb") != float("inf") else None
            if response is not None:
                self.assertEqual(response.status_code, 400)
        from core.corridor_forecast import ForecastValidationError, validate_forecast
        with self.assertRaises(ForecastValidationError):
            validate_forecast({**request_data(), "load_weight_lb": float("inf")})
        fetch.assert_not_called()

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_api_failure_is_safe_and_has_no_demo_fallback(self, fetch):
        fetch.side_effect = WeatherProviderError("https://provider.test?apikey=FAKE_KEY internal trace")
        with self.assertLogs("core.forecast_views", level="WARNING") as logs:
            response = self.client.post("/api/corridor-forecasts/", request_data(), format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], "Corridor forecast is temporarily unavailable.")
        self.assertEqual(response.data["code"], "corridor_forecast_unavailable")
        UUID(response.data["request_id"])
        self.assertNotIn("FAKE_KEY", str(response.data) + str(logs.output))
        self.assertNotIn("internal trace", str(response.data) + str(logs.output))
        self.assertNotIn("frames", response.data)

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_malformed_weather_is_not_cached(self, fetch):
        invalid = payload()
        invalid["hourly"]["wind_speed_10m"][1] = float("nan")
        fetch.side_effect = [([invalid], "retrieved"), ([payload()], "retrieved")]
        with self.assertRaises(WeatherProviderError):
            corridor_forecast(request_data())
        result = corridor_forecast(request_data())
        self.assertEqual(len(result["frames"]), 49)
        self.assertEqual(fetch.call_count, 2)

    @patch("core.corridor_forecast.fetch_forecasts")
    def test_batches_are_bounded(self, fetch):
        fetch.side_effect = lambda points: ([payload()] * len(points), "retrieved")
        data = request_data()
        data["points"] = [{"id": str(i), "route_id": "a", "coordinates": {"lat": i / 100, "lon": 0}} for i in range(51)]
        result = corridor_forecast(data)
        self.assertEqual([len(call.args[0]) for call in fetch.call_args_list], [50, 1])
        self.assertEqual(len(result["frames"][0]["samples"]), 51)


class WindRuleRegressions(SimpleTestCase):
    def test_wind_boundaries_and_load_overrides(self):
        for wind, load, expected in ((24.9, 0, "Low"), (25, 0, "Moderate"),
                                     (35, 30001, "High"), (44.9, 40000, "High"),
                                     (35, 40001, "Severe"), (45, 30000, "Severe"),
                                     (54.9, 30000, "Severe"), (45, 30001, "No Travel"),
                                     (55, 0, "No Travel")):
            with self.subTest(wind=wind, load=load):
                self.assertEqual(classify_weather(Weather(wind, 0, 0), load)[0], expected)

    def test_known_no_travel_survives_missing_measurements(self):
        self.assertEqual(classify_weather(Weather(55, None, None), 0)[0], "No Travel")
        self.assertEqual(classify_weather(Weather(None, 1.01, None), 0)[0], "No Travel")
        self.assertEqual(classify_weather(Weather(None, None, 3.01), 0)[0], "No Travel")
        self.assertEqual(classify_weather(Weather(10, None, 0), 0)[0], "Unknown")
