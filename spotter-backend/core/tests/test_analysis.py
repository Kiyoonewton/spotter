from django.test import SimpleTestCase

from core.analysis import Weather, classify_weather


class RiskRulesTests(SimpleTestCase):
    def test_boundaries_and_load_overrides(self):
        self.assertEqual(classify_weather(Weather(24.99, 0, 0), 0)[0], "Low")
        self.assertEqual(classify_weather(Weather(25, 0, 0), 0)[0], "Moderate")
        self.assertEqual(classify_weather(Weather(38, .31, 0), 42000)[0], "Severe")
        self.assertEqual(classify_weather(Weather(45, 0, 0), 30000)[0], "High")
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

    def test_invalid_request(self):
        response = self.client.post("/api/trip-analyses/", {"origin": "New York, NY"}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.json())
