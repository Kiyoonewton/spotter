import copy
import json
from dataclasses import replace
from unittest.mock import patch, MagicMock
from urllib.parse import parse_qs, urlparse
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient
from core.truck_profile import validate_truck_profile, vehicle_parameters, TruckProfileError
from core.routing import calculate_routes, RouteRequest, normalize_routes, RoutingProviderError
from core.live_analysis import analyze_live
from core.tests.test_routing import route as provider_route
from core.tests.test_live_orchestration import ROUTE, WEATHER
from core.tests.test_departure_comparison import analysis
from core.departure_comparison import compare_departures

PROFILE = {"height_ft": 13.5, "width_ft": 8.5, "length_ft": 70,
           "current_weight_lb": 70000, "gross_weight_lb": 80000, "weight_per_axle_lb": 17000}
REQUEST = {"mode": "live", "origin": "Chicago", "destination": "Pittsburgh",
           "origin_coordinates": {"lat": 41, "lon": -87}, "destination_coordinates": {"lat": 40, "lon": -80},
           "departure_at": "2026-10-13T12:00:00Z", "departure_timezone": "America/Chicago",
           "load_weight_lb": 20000, "checkpoint_spacing_miles": 50}


class TruckProfileTests(SimpleTestCase):
    def test_measurements_are_rounded_up_into_explicit_here_units(self):
        self.assertEqual(vehicle_parameters(PROFILE), {"vehicle[height]": 412, "vehicle[width]": 260,
            "vehicle[length]": 2134, "vehicle[currentWeight]": 31752,
            "vehicle[grossWeight]": 36288, "vehicle[weightPerAxle]": 7712})
        self.assertEqual(vehicle_parameters(None), {})
        self.assertEqual(validate_truck_profile(PROFILE, 42000), PROFILE)

    def test_rejects_partial_unknown_nonfinite_boolean_and_inconsistent_values(self):
        invalid = [None, {}, {**PROFILE, "unexpected": 1}, {**PROFILE, "current_weight_lb": 90000},
                   {**PROFILE, "weight_per_axle_lb": 80000}, {**PROFILE, "current_weight_lb": 19000}]
        for value in (True, float("nan"), float("inf"), -1, 0, "13.5", 26):
            invalid.append({**PROFILE, "height_ft": value})
        for item in invalid:
            with self.subTest(item=item), self.assertRaises(TruckProfileError): validate_truck_profile(item, 20000)

    @patch.dict("os.environ", {"HERE_API_KEY": "fake-key"})
    @patch("core.routing.urlopen")
    def test_provider_request_sends_separate_weights_and_dimensions(self, fetch):
        response = MagicMock()
        response.read.return_value = json.dumps({"routes": [provider_route("a")]}).encode()
        fetch.return_value.__enter__.return_value = response
        calculate_routes(RouteRequest(41, -87, 40, -80, "2026-10-13T12:00:00Z", PROFILE))
        params = parse_qs(urlparse(fetch.call_args.args[0].full_url).query)
        self.assertEqual(params["vehicle[currentWeight]"], ["31752"])
        self.assertEqual(params["vehicle[grossWeight]"], ["36288"])
        self.assertEqual(params["vehicle[height]"], ["412"])

    @patch("core.live_analysis.fetch_hourly", return_value=[replace(WEATHER, wind_mph=40)] * 3)
    @patch("core.live_analysis.calculate_routes", return_value=[ROUTE])
    def test_cargo_remains_weather_input_and_profile_reaches_routing(self, routing, weather):
        result = analyze_live({**REQUEST, "truck_profile": PROFILE})
        self.assertEqual(routing.call_args.args[0].truck_profile, PROFILE)
        self.assertEqual(result["routes"][0]["risk_miles"]["Severe"], 0)
        self.assertGreater(result["routes"][0]["risk_miles"]["High"], 0)
        self.assertEqual(result["truck_profile"], PROFILE)

    @patch("core.live_analysis.fetch_hourly", return_value=[WEATHER] * 2)
    @patch("core.live_analysis.calculate_routes")
    def test_critical_notices_cannot_win_or_expose_raw_provider_text(self, routing, weather):
        source = provider_route("blocked")
        source["sections"][0]["notices"] = [{"severity": "critical", "code": "violatedTruckRestriction", "title": "fake-api-key https://provider.test/private internal-detail"}]
        routing.return_value = normalize_routes({"routes": [source]})
        result = analyze_live({**REQUEST, "truck_profile": PROFILE})
        self.assertIsNone(result["recommendation"]["recommended_route_id"])
        self.assertEqual(result["routes"][0]["eligibility"], "blocked")
        self.assertFalse(result["routes"][0]["routing_eligible"])
        self.assertEqual(result["routes"][0]["risk_miles"]["No Travel"], 0)
        for secret in ("fake-api-key", "https://provider.test", "internal-detail"):
            self.assertNotIn(secret, json.dumps(result))

    def test_duplicate_shapes_cannot_drop_critical_notices(self):
        clear, blocked = provider_route("clear"), provider_route("duplicate")
        blocked["sections"][0]["notices"] = [{"severity": "critical"}]
        result = normalize_routes({"routes": [clear, blocked]})
        self.assertEqual(len(result), 1)
        self.assertTrue(result[0].critical_notice)
        blocked["sections"][0]["notices"] = [{"severity": "unexpected"}]
        with self.assertRaises(RoutingProviderError): normalize_routes({"routes": [blocked]})

    def test_weather_only_departures_cannot_clear_physical_restrictions(self):
        source = analysis("demo")
        for item in source["routes"]: item["routing_eligible"] = False
        before = copy.deepcopy(source)
        result = compare_departures(source)
        self.assertIsNone(result["best_choice"])
        self.assertTrue(all(window["recommended_route_id"] is None for window in result["windows"]))
        self.assertTrue(all(route["eligibility"] == "blocked" for window in result["windows"] for route in window["routes"]))
        self.assertEqual(source, before)


class TruckProfileAPITests(TestCase):
    @patch("core.views.analyze_live")
    def test_invalid_profile_rejected_before_provider_and_demo_never_ignores_it(self, live):
        client = APIClient()
        for profile in ({}, {**PROFILE, "current_weight_lb": 19000}, {**PROFILE, "height_ft": True}, None):
            response = client.post("/api/trip-analyses/", {**REQUEST, "truck_profile": profile}, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("truck_profile", response.json()["errors"])
        live.assert_not_called()
        response = client.post("/api/trip-analyses/", {**REQUEST, "mode": "demo", "origin": "Chicago, IL", "destination": "Pittsburgh, PA", "truck_profile": PROFILE}, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("core.views.analyze_live")
    def test_profile_is_server_validated_saved_and_restored(self, live):
        live.return_value = {"analysis_id": "profile-owned", "data_source": "live", "routes": [], "recommendation": {"recommended_route_id": None}}
        client = APIClient()
        response = client.post("/api/trip-analyses/", {**REQUEST, "truck_profile": PROFILE, "save_snapshot": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(live.call_args.args[0]["truck_profile"], PROFILE)
        restored = client.post("/api/saved-analyses/restore/", {"token": response.json()["snapshot"]["token"]}, format="json")
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()["applied_request"]["truck_profile"], PROFILE)
