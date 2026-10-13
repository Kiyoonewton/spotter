from django.test import SimpleTestCase

from core.analysis import Weather, analyze_trip, classify_weather


class RiskRulesTests(SimpleTestCase):
    def test_boundaries_and_load_overrides(self):
        self.assertEqual(classify_weather(Weather(24.99, 0, 0), 0)[0], "Low")
        self.assertEqual(classify_weather(Weather(25, 0, 0), 0)[0], "Moderate")
        self.assertEqual(classify_weather(Weather(38, .31, 0), 42000)[0], "Severe")
        self.assertEqual(classify_weather(Weather(45, 0, 0), 30000)[0], "Severe")
        self.assertEqual(classify_weather(Weather(45, 0, 0), 30001)[0], "No Travel")
        self.assertEqual(classify_weather(Weather(55, 0, 0), 0)[0], "No Travel")
        self.assertEqual(classify_weather(Weather(None, 0, 0), 0)[0], "Unknown")

    def test_higher_non_wind_risk_is_not_reduced_by_load(self):
        self.assertEqual(classify_weather(Weather(35, 1.1, 0), 0)[0], "No Travel")


class AnalysisApiTests(SimpleTestCase):
    def test_analysis_contract_and_spacing(self):
        response = self.client.post("/api/trip-analyses/", {"origin": "Chicago, IL", "destination": "Pittsburgh, PA", "departure_at": "2026-10-10T10:00:00-05:00", "departure_timezone": "America/Chicago", "load_weight_lb": 42000, "checkpoint_spacing_miles": 25}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["routes"]), 3)
        self.assertEqual(body["routes"][0]["checkpoints"][1]["distance_from_origin_miles"], 25)
        self.assertTrue(body["routes"][0]["segments"])
        self.assertEqual(body["recommendation"]["recommended_route_id"], "A")
        self.assertEqual(body["routes"][0]["eligibility"], "eligible")

    def test_invalid_request(self):
        response = self.client.post("/api/trip-analyses/", {"origin": "New York, NY"}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.json())


class DemoJourneyTests(SimpleTestCase):
    def test_recommendation_preserves_missing_and_blocked_examples(self):
        for spacing in (10, 25, 50):
            results = []
            for weight in (30000, 42000):
                with self.subTest(spacing=spacing, weight=weight):
                    result = analyze_trip({
                        "departure_at": "2026-10-12T10:00:00-05:00",
                        "load_weight_lb": weight,
                        "checkpoint_spacing_miles": spacing,
                    })
                    a, b, c = result["routes"]
                    self.assertEqual(result["recommendation"]["recommended_route_id"], "A")
                    self.assertEqual(a["eligibility"], "eligible")
                    self.assertEqual(a["forecast_coverage_percent"], 100)
                    self.assertEqual(a["risk_miles"]["Unknown"], 0)
                    self.assertIsNotNone(a["average_risk"])
                    self.assertEqual(b["eligibility"], "incomplete")
                    self.assertGreater(b["risk_miles"]["Unknown"], 0)
                    self.assertEqual(c["eligibility"], "blocked")
                    for route in result["routes"]:
                        self.assertAlmostEqual(sum(route["risk_miles"].values()), route["distance_miles"])
                    results.append(a)
            self.assertGreater(results[1]["risk_miles"]["Severe"], results[0]["risk_miles"]["Severe"])
            self.assertLess(results[1]["risk_miles"]["High"], results[0]["risk_miles"]["High"])
