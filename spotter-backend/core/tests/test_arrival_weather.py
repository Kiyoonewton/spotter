from datetime import datetime, timezone
from unittest.mock import patch
from copy import deepcopy
from threading import Lock
from time import sleep
from urllib.error import HTTPError, URLError
from django.core.cache import cache
from django.test import SimpleTestCase

from core.weather import WeatherCheckpoint, WeatherProviderError, fetch_forecasts, fetch_hourly
from core.tests.test_weather import FIXTURE


class ArrivalWeatherTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def points(self, count=1):
        return [WeatherCheckpoint(40 + i / 1000, -87, datetime(2026, 10, 10, 10, 30, tzinfo=timezone.utc)) for i in range(count)]

    @patch("core.arrival_weather.fetch_forecasts")
    def test_large_request_is_bounded_and_order_preserved(self, fetch):
        lock, state = Lock(), {"active": 0, "peak": 0}
        def provider(points):
            with lock:
                state["active"] += 1
                state["peak"] = max(state["peak"], state["active"])
            sleep(0.01)
            payloads = []
            for point in points:
                payload = deepcopy(FIXTURE)
                payload["hourly"]["wind_speed_10m"] = [point.latitude] * 3
                payloads.append(payload)
            with lock:
                state["active"] -= 1
            return payloads, "retrieved"
        fetch.side_effect = provider
        points = self.points(121)
        result = fetch_hourly(points)
        self.assertLessEqual(state["peak"], 2)
        for point, weather in zip(points, result):
            self.assertAlmostEqual(weather.wind_mph, point.latitude * 0.621371192)
        self.assertEqual(len(result), 121)
        self.assertEqual(sorted(len(call.args[0]) for call in fetch.call_args_list), [21, 50, 50])
        self.assertTrue(all(item.retrieved_at == "retrieved" for item in result))

    @patch("core.arrival_weather.fetch_forecasts")
    def test_shared_coordinates_fetched_once_but_eta_selected_independently(self, fetch):
        fetch.return_value = ([FIXTURE], "retrieved")
        first = self.points()[0]
        second = WeatherCheckpoint(first.latitude, first.longitude, datetime(2026, 10, 10, 11, 30, tzinfo=timezone.utc))
        result = fetch_hourly([first, second])
        self.assertEqual(len(fetch.call_args.args[0]), 1)
        self.assertNotEqual(result[0].rain_in_hr, result[1].rain_in_hr)
        self.assertEqual(fetch_hourly([first, second]), result)
        self.assertEqual(fetch.call_count, 1)

    @patch("core.arrival_weather.fetch_forecasts")
    def test_failure_does_not_cache_partial_or_return_demo(self, fetch):
        fetch.side_effect = WeatherProviderError("secret URL", category="rate_limited")
        with self.assertRaises(WeatherProviderError):
            fetch_hourly(self.points())
        fetch.side_effect = None
        fetch.return_value = ([FIXTURE], "retrieved")
        self.assertIsNotNone(fetch_hourly(self.points())[0])
        self.assertEqual(fetch.call_count, 2)

    @patch("core.arrival_weather.fetch_forecasts")
    def test_malformed_response_not_cached(self, fetch):
        fetch.return_value = ([{"bad": {}}], "retrieved")
        with self.assertRaises(WeatherProviderError):
            fetch_hourly(self.points())
        fetch.return_value = ([FIXTURE], "retrieved")
        self.assertIsNotNone(fetch_hourly(self.points())[0])
        self.assertEqual(fetch.call_count, 2)

    @patch("core.arrival_weather.fetch_forecasts")
    def test_budget_checked_before_provider_access(self, fetch):
        with self.assertRaises(WeatherProviderError):
            fetch_hourly(self.points(201))
        fetch.assert_not_called()
        self.assertEqual(fetch_hourly([]), [])

    @patch("core.weather.urlopen")
    def test_safe_failure_categories_and_no_rate_limit_retries(self, request):
        secret = "https://provider.test?apikey=FAKE_KEY internal detail"
        cases = [
            (HTTPError(secret, 429, secret, {}, None), "rate_limited"),
            (HTTPError(secret, 503, secret, {}, None), "http_5xx"),
            (HTTPError(secret, 400, secret, {}, None), "http_4xx"),
            (TimeoutError(secret), "timeout"),
            (URLError(TimeoutError(secret)), "timeout"),
            (URLError(secret), "network"),
            (ConnectionResetError(secret), "network"),
        ]
        for error, category in cases:
            with self.subTest(category=category):
                request.reset_mock()
                request.side_effect = error
                with self.assertRaises(WeatherProviderError) as raised:
                    fetch_forecasts(self.points())
                self.assertEqual(raised.exception.category, category)
                self.assertEqual(request.call_count, 1)
                self.assertNotIn("FAKE_KEY", str(raised.exception))
        self.assertEqual(WeatherProviderError(secret, category=secret).category, "invalid_data")
