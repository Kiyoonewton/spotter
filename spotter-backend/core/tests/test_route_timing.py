from datetime import datetime
from unittest.mock import patch, MagicMock
from urllib.parse import parse_qs, urlparse

from django.test import SimpleTestCase

from core.checkpoints import sample_route, MILES_PER_METER
from core.live_analysis import analyze_live
from core.routing import normalize_routes, calculate_routes, RouteRequest, RoutingProviderError
from core.weather import NormalizedWeather


def polyline(points):
    """Encode a tiny fixture with HERE v1 precision 5 (not the production decoder)."""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    def encode(value):
        output = ""
        while value >= 32:
            output += alphabet[(value & 31) | 32]
            value >>= 5
        return output + alphabet[value]
    result = encode(1) + encode(5)
    previous = (0, 0)
    for point in points:
        current = tuple(round(value * 100000) for value in point)
        for value, old in zip(current, previous):
            delta = value - old
            result += encode(delta * 2 if delta >= 0 else -delta * 2 - 1)
        previous = current
    return result


def section(points, durations, offsets=None, length_miles=50):
    length = length_miles / MILES_PER_METER
    return {"polyline": polyline(points), "summary": {"length": length, "duration": sum(durations)},
            "spans": [{"offset": offset, "duration": duration, "length": length / len(durations)}
                      for offset, duration in zip(offsets or list(range(len(durations))), durations)]}


def payload():
    return {"routes": [{"id": "owned", "sections": [section([(0, 0), (0, 1), (0, 2)], [900, 100])]}]}


class RouteTimingTests(SimpleTestCase):
    def test_unequal_speed_spans_change_arrivals_preserving_geometry_and_totals(self):
        route = normalize_routes(payload())[0]
        checkpoints, segments, metadata = sample_route(route, 25, "2026-10-12T23:50:00-04:00")
        self.assertEqual([point.elapsed_seconds for point in checkpoints], [0, 900, 1000])
        self.assertEqual(checkpoints[1].coordinates, (0, 1))
        self.assertEqual(checkpoints[-1].arrival_at, "2026-10-13T04:06:40Z")
        self.assertEqual(metadata["timing_method"], "here_span_interpolation")
        self.assertEqual(metadata["timing_span_count"], 2)
        self.assertTrue(all(point.route_id == "owned" for point in checkpoints))
        for segment, start, end in zip(segments, checkpoints, checkpoints[1:]):
            self.assertEqual(segment.coordinates[0], start.coordinates)
            self.assertEqual(segment.coordinates[-1], end.coordinates)
        self.assertAlmostEqual(sum(item.distance_miles for item in segments), 50)

    def test_multi_section_offsets_are_local_and_destination_time_is_exact(self):
        data = payload()
        data["routes"][0]["sections"] = [section([(0, 0), (0, 1)], [300], length_miles=25),
            section([(0, 1), (0, 2), (0, 3)], [600, 100], length_miles=50)]
        route = normalize_routes(data)[0]
        points, _, _ = sample_route(route, 25, "2026-10-12T12:00:00Z")
        self.assertEqual([point.elapsed_seconds for point in points], [0, 300, 900, 1000])
        self.assertEqual(route.coordinates[1], route.coordinates[2])

    def test_interpolates_inside_a_span_and_small_rounding_difference(self):
        data = payload()
        data["routes"][0]["sections"][0]["summary"]["duration"] = 1001
        route = normalize_routes(data)[0]
        points, _, _ = sample_route(route, 10, "2026-10-12T12:00:00Z")
        self.assertEqual([point.elapsed_seconds for point in points], [0, 360, 721, 921, 961, 1001])

    def test_unusable_optional_spans_fall_back_for_entire_route(self):
        for change in (lambda s: s.pop("spans"), lambda s: s["spans"][0].update(offset=1),
                       lambda s: s["spans"][1].update(offset=0), lambda s: s["spans"][1].update(offset=99),
                       lambda s: s["spans"][0].update(duration=-1), lambda s: s["spans"][0].update(duration=True),
                       lambda s: s["spans"][0].update(duration=float("nan")),
                       lambda s: s["spans"][0].update(length=None), lambda s: s["spans"][0].update(duration=100),
                       lambda s: s["spans"][0].update(length=1)):
            with self.subTest(change=change):
                data = payload()
                change(data["routes"][0]["sections"][0])
                route = normalize_routes(data)[0]
                points, _, metadata = sample_route(route, 25, "2026-10-12T12:00:00Z")
                self.assertEqual([point.elapsed_seconds for point in points], [0, 500, 1000])
                self.assertEqual(metadata["timing_method"], "distance_proportional_estimate")

    def test_missing_one_section_or_disconnected_geometry_cannot_claim_span_timing(self):
        for connected in (True, False):
            data = payload()
            second = section([(0, 2 if connected else 3), (0, 4)], [100], length_miles=25)
            if connected:
                second.pop("spans")
            data["routes"][0]["sections"].append(second)
            self.assertIsNone(normalize_routes(data)[0].timing_profile)

    def test_invalid_route_summary_is_not_hidden_by_timing_fallback(self):
        for value in (True, float("nan"), float("inf"), -1, "100"):
            data = payload()
            data["routes"][0]["sections"][0]["summary"]["length"] = value
            with self.assertRaises(RoutingProviderError):
                normalize_routes(data)

    @patch.dict("os.environ", {"HERE_API_KEY": "fake-test-key"})
    @patch("core.routing.urlopen")
    def test_provider_request_asks_for_speed_change_spans(self, request):
        import json
        response = MagicMock()
        response.read.return_value = json.dumps(payload()).encode()
        request.return_value.__enter__.return_value = response
        calculate_routes(RouteRequest(0, 0, 0, 2, "2026-10-12T12:00:00Z"))
        query = parse_qs(urlparse(request.call_args.args[0].full_url).query)
        self.assertEqual(query["spans"], ["duration,length,dynamicSpeedInfo"])
        self.assertEqual(query["transportMode"], ["truck"])

    @patch("core.live_analysis.fetch_hourly")
    @patch("core.live_analysis.calculate_routes")
    def test_weather_is_requested_at_span_eta_not_uniform_eta(self, routing, weather):
        routing.return_value = normalize_routes(payload())
        def forecasts(points):
            result = []
            for point in points:
                rain = .3 if point.arrival_at >= datetime.fromisoformat("2026-10-12T12:12:00+00:00") else 0
                result.append(NormalizedWeather(wind_mph=10, rain_in_hr=rain, snow_in_hr=0, forecast_valid_at="2026-10-12T13:00:00Z", interval_start="2026-10-12T12:00:00Z", interval_end="2026-10-12T13:00:00Z", interval_minutes=60, provider="open-meteo", retrieved_at="2026-10-12T12:00:00Z"))
            return result
        weather.side_effect = forecasts
        result = analyze_live({"origin_coordinates": {"lat": 0, "lon": 0}, "destination_coordinates": {"lat": 0, "lon": 2}, "departure_at": "2026-10-12T12:00:00Z", "checkpoint_spacing_miles": 25, "load_weight_lb": 20000})
        route = result["routes"][0]
        self.assertEqual(route["timing_method"], "here_span_interpolation")
        self.assertEqual(route["checkpoints"][1]["arrival_at"], "2026-10-12T12:15:00Z")
        self.assertEqual(route["risk_miles"]["High"], 25)
        self.assertEqual(route["checkpoints"][1]["risk"], "High")
