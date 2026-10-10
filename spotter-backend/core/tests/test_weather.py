from datetime import datetime, timezone
from django.test import SimpleTestCase

from core.weather import WeatherProviderError, select_hour


FIXTURE = {
    "hourly": {
        "time": ["2026-10-10T10:00", "2026-10-10T11:00"],
        "wind_speed_10m": [16.0934, None],
        "rain": [25.4, 0],
        "snowfall": [2.54, 0],
    }
}


class WeatherAdapterTests(SimpleTestCase):
    def test_converts_units_and_distinguishes_wind_rain_snow(self):
        result = select_hour(FIXTURE, datetime(2026, 10, 10, 10, 30, tzinfo=timezone.utc), "retrieved")
        self.assertEqual(result.wind_mph, 10.0)
        self.assertAlmostEqual(result.rain_in_hr, 1.0)
        self.assertAlmostEqual(result.snow_in_hr, 1.0)
        self.assertEqual(result.interval_minutes, 60)

    def test_boundaries_and_out_of_horizon(self):
        self.assertEqual(select_hour(FIXTURE, "2026-10-10T11:00:00Z").forecast_valid_at, "2026-10-10T11:00:00Z")
        self.assertIsNone(select_hour(FIXTURE, "2026-10-10T12:00:00Z"))

    def test_missing_variable_and_malformed_payload(self):
        result = select_hour({"hourly": {"time": FIXTURE["hourly"]["time"]}}, "2026-10-10T10:00:00Z")
        self.assertIsNone(result.wind_mph)
        with self.assertRaises(WeatherProviderError):
            select_hour({"bad": {}}, "2026-10-10T10:00:00Z")

    def test_requires_offset_aware_eta(self):
        with self.assertRaises(WeatherProviderError):
            select_hour(FIXTURE, "2026-10-10T10:00:00")
