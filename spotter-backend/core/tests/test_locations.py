from django.test import SimpleTestCase

from unittest.mock import patch
from io import BytesIO
import json
from urllib.parse import parse_qs, urlsplit

from core.providers import ProviderError, search_locations
from rest_framework.test import APIClient


class LocationSearchTests(SimpleTestCase):
    @patch("core.views.search_locations", side_effect=ProviderError("https://provider.test?key=fake-secret internal detail"))
    def test_api_hides_location_provider_error(self, search):
        response = APIClient().get("/api/locations/", {"q": "Chicago", "mode": "live"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "location_search_unavailable")
        self.assertEqual(response.data["error"], "Location search is temporarily unavailable.")
        self.assertRegex(response.data["request_id"], r"^[0-9a-f-]{36}$")
        self.assertNotIn("fake-secret", str(response.data))
        self.assertNotIn("internal detail", str(response.data))
        search.assert_called_once()
    def test_demo_search_returns_normalized_candidates(self):
        result = search_locations("chicago")
        self.assertEqual(result[0].provider_id, "demo:chicago")
        self.assertEqual(result[0].timezone, "America/Chicago")

    def test_search_is_bounded_by_query(self):
        self.assertEqual(search_locations("not a city"), [])

    @patch.dict("os.environ", {"OPENCAGE_API_KEY": "test-key"})
    @patch("core.providers.urlopen")
    def test_normalizes_opencage_response_and_limits_results(self, urlopen):
        payload = {"status": {"code": 200}, "results": [{
            "formatted": "Chicago, Illinois, United States",
            "geometry": {"lat": 41.8781, "lng": -87.6298},
            "annotations": {"timezone": {"name": "America/Chicago"}},
        }] * 8}
        response = BytesIO(__import__("json").dumps(payload).encode())
        response.__enter__ = lambda: response
        response.__exit__ = lambda *_: None
        urlopen.return_value = response
        result = search_locations("Chicago", mode="live")
        self.assertEqual(len(result), 5)
        self.assertEqual(result[0].provider_id, "opencage:41.878100:-87.629800")

    @patch.dict("os.environ", {"OPENCAGE_API_KEY": ""})
    def test_live_requires_provider_configuration(self):
        with self.assertRaisesMessage(ProviderError, "OPENCAGE_API_KEY"):
            search_locations("Chicago", mode="live")


    @patch.dict("os.environ", {"OPENCAGE_API_KEY": "test-key"})
    @patch("core.providers.urlopen")
    def test_live_api_preserves_requested_timezone_annotations(self, upstream):
        def provider_response(request, timeout):
            params = parse_qs(urlsplit(request.full_url).query)
            self.assertEqual(params["q"], ["Chicago"])
            self.assertEqual(params["limit"], ["5"])
            self.assertEqual(timeout, 5)
            item = {
                "formatted": "Chicago, Illinois, United States",
                "geometry": {"lat": 41.8781, "lng": -87.6298},
            }
            # Model the provider contract: disabling annotations removes timezone.
            if params.get("no_annotations") != ["1"]:
                item["annotations"] = {"timezone": {"name": "America/Chicago"}}
            return BytesIO(json.dumps({"status": {"code": 200}, "results": [item]}).encode())

        upstream.side_effect = provider_response
        response = APIClient().get("/api/locations/", {"q": "Chicago", "mode": "live"})
        self.assertEqual(response.status_code, 200)
        candidate = response.data["results"][0]
        self.assertEqual(candidate["timezone"], "America/Chicago")
        self.assertEqual(candidate["latitude"], 41.8781)
        self.assertEqual(candidate["longitude"], -87.6298)
        upstream.assert_called_once()

    @patch.dict("os.environ", {"OPENCAGE_API_KEY": "test-key"})
    @patch("core.providers.urlopen")
    def test_missing_provider_timezone_remains_unavailable(self, upstream):
        payload = {"status": {"code": 200}, "results": [{
            "formatted": "Location without timezone",
            "geometry": {"lat": 1, "lng": 2},
        }]}
        upstream.return_value = BytesIO(json.dumps(payload).encode())
        candidate = search_locations("Location", mode="live")[0]
        self.assertIsNone(candidate.timezone)
