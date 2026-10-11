from datetime import datetime, timezone
from django.test import SimpleTestCase

from core.weather import WeatherProviderError, select_hour


FIXTURE = {
    "hourly_units": {"wind_speed_10m": "km/h", "rain": "mm", "showers": "mm", "snowfall": "cm"},
    "hourly": {
        "time": ["2026-10-10T10:00", "2026-10-10T11:00", "2026-10-10T12:00"],
        "wind_speed_10m": [16.0934, 32.1869, None],
        "rain": [1, 25.4, 2],
        "showers": [2, 25.4, 4],
        "snowfall": [1, 2.54, 3],
    }
}


class WeatherAdapterTests(SimpleTestCase):
    def test_converts_units_and_distinguishes_wind_rain_snow(self):
        result = select_hour(FIXTURE, datetime(2026, 10, 10, 10, 30, tzinfo=timezone.utc), "retrieved")
        self.assertAlmostEqual(result.wind_mph, 10.0, places=4)
        self.assertAlmostEqual(result.rain_in_hr, 2.0)
        self.assertAlmostEqual(result.snow_in_hr, 1.0)
        self.assertEqual(result.interval_start, "2026-10-10T10:00:00Z")
        self.assertEqual(result.interval_end, "2026-10-10T11:00:00Z")
        self.assertEqual(result.interval_minutes, 60)

    def test_boundaries_and_out_of_horizon(self):
        self.assertEqual(select_hour(FIXTURE, "2026-10-10T11:00:00Z").forecast_valid_at, "2026-10-10T12:00:00Z")
        self.assertIsNone(select_hour(FIXTURE, "2026-10-10T12:00:00Z"))

    def test_missing_variable_and_malformed_payload(self):
        result = select_hour({"hourly": {"time": FIXTURE["hourly"]["time"]}}, "2026-10-10T10:00:00Z")
        self.assertIsNone(result.wind_mph)
        with self.assertRaises(WeatherProviderError):
            select_hour({"bad": {}}, "2026-10-10T10:00:00Z")

    def test_requires_offset_aware_eta(self):
        with self.assertRaises(WeatherProviderError):
            select_hour(FIXTURE, "2026-10-10T10:00:00")

    def test_missing_nearest_wind_is_not_replaced_by_distant_sample(self):
        fixture = {"hourly": {"time": ["2026-10-10T09:00", "2026-10-10T10:00", "2026-10-10T11:00"], "wind_speed_10m": [20, None, 40], "rain": [0, 1, 1], "showers": [0, 1, 1], "snowfall": [0, 0, 0]}}
        result = select_hour(fixture, "2026-10-10T10:05:00Z")
        self.assertIsNone(result.wind_mph)

    def test_gap_in_hourly_coverage_is_not_extrapolated(self):
        fixture = {"hourly": {"time": ["2026-10-10T10:00", "2026-10-10T13:00"]}}
        self.assertIsNone(select_hour(fixture, "2026-10-10T11:00:00Z"))

    def test_non_finite_measurement_is_malformed_not_zero(self):
        fixture = {"hourly": {"time": FIXTURE["hourly"]["time"], "wind_speed_10m": [float("nan"), 1, 1]}}
        with self.assertRaises(WeatherProviderError):
            select_hour(fixture, "2026-10-10T10:00:00Z")
